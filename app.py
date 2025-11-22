import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text, ForeignKey, UniqueConstraint, Enum, DECIMAL, TIME, DATE, TIMESTAMP, func
from sqlalchemy.orm import relationship, joinedload
from decimal import Decimal
import datetime
from datetime import timedelta # <-- IMPORT FOR TOKEN EXPIRY

# --- IMPORTS ---
from flask_bcrypt import Bcrypt
# --- IMPORT get_jwt ---
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS
from functools import wraps # <-- IMPORT FOR ADMIN DECORATOR

# =========================================================
# 1. SETUP & CONFIGURATION
# =========================================================
app = Flask(__name__)
CORS(app) # <-- This is the only CORS setup you need

# --- DB Connection ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:Mn2005015@localhost/NutritionDB'

# --- JWT Config ---
app.config['JWT_SECRET_KEY'] = 'your-super-secret-key-change-me'
# -----------------------------

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.json.ensure_ascii = False

db = SQLAlchemy(app)

# --- Initialize Auth libraries ---
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
# --------------------------------------

# =========================================================
# 2. DATABASE MODELS (Mapping to your tables)
# =========================================================

# Helper class to add a .to_dict() method to all models
class Base(db.Model):
    __abstract__ = True
    
    def to_dict(self, exclude=None, relationships=None):
        if exclude is None:
            exclude = []
        
        data = {}
        for c in self.__table__.columns:
            if c.name in exclude:
                continue
            
            val = getattr(self, c.name)
            
            if isinstance(val, (datetime.date, datetime.time)):
                data[c.name] = val.isoformat()
            elif isinstance(val, Decimal):
                data[c.name] = float(val)
            elif isinstance(val, datetime.datetime):
                data[c.name] = val.isoformat()
            else:
                data[c.name] = val
                
        if relationships:
            for rel_name, rel_fields in relationships.items():
                rel_data = []
                rel_object = getattr(self, rel_name)
                if isinstance(rel_object, list): # One-to-many
                    for item in rel_object:
                        rel_data.append(item.to_dict(exclude=rel_fields.get('exclude', [])))
                elif rel_object: # One-to-one
                    rel_data = rel_object.to_dict(exclude=rel_fields.get('exclude', []))
                data[rel_name] = rel_data
        return data

class User(Base):
    __tablename__ = 'User'
    User_ID = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(100), nullable=False)
    Email = db.Column(db.String(255), nullable=False, unique=True)
    Password = db.Column(db.String(255), nullable=False) # Will store hash
    Date_Of_Birth = db.Column(DATE)
    Gender = db.Column(Enum('Male', 'Female', 'Other'), default='Other')
    Height_cm = db.Column(db.SmallInteger)
    Weight_kg = db.Column(DECIMAL(5, 2))
    Activity_Level = db.Column(Enum('Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'), default='Moderate')
    Dietary_Preferences = db.Column(db.String(100))
    Allergies = db.Column(db.String(255))
    BMI = db.Column(DECIMAL(5, 2))
    role = db.Column(Enum('user', 'admin'), nullable=False, default='user') # <-- Admin role
    Created_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    Updated_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    # Relationships
    recipes = relationship('Recipe', back_populates='creator')
    
    # --- THIS IS THE FIX for the DELETE error ---
    # These tell SQLAlchemy to delete all child objects when the parent User is deleted.
    diet_logs = relationship('User_Diet_Log', back_populates='user', cascade="all, delete-orphan")
    meal_plans = relationship('Meal_Plan', back_populates='user', cascade="all, delete-orphan")
    feedback = relationship('Feedback', back_populates='user', cascade="all, delete-orphan")
    weight_history = relationship('User_Weight_History', back_populates='user', cascade="all, delete-orphan")
    # --- END OF FIX ---

class Recipe(Base):
    __tablename__ = 'Recipe'
    Recipe_ID = db.Column(db.Integer, primary_key=True)
    Recipe_Name = db.Column(db.String(200), nullable=False)
    Description = db.Column(db.Text)
    Cuisine_Type = db.Column(db.String(100))
    Preparation_Time_minutes = db.Column(db.SmallInteger, default=0)
    Cooking_Time_minutes = db.Column(db.SmallInteger, default=0)
    Serving_Size = db.Column(DECIMAL(4, 2), nullable=False, default=1)
    Difficulty_Level = db.Column(Enum('Easy', 'Medium', 'Hard'), default='Easy')
    Instructions = db.Column(db.Text)
    Creator_User_ID = db.Column(db.Integer, ForeignKey('User.User_ID', ondelete='SET NULL', onupdate='CASCADE'))
    Created_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    Updated_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    # Relationships
    creator = relationship('User', back_populates='recipes')
    ingredients = relationship('Recipe_Ingredient', back_populates='recipe', cascade="all, delete-orphan")
    diet_logs = relationship('User_Diet_Log', back_populates='recipe')
    meal_plans = relationship('MealPlan_Recipe', back_populates='recipe')
    feedback = relationship('Feedback', back_populates='recipe', cascade="all, delete-orphan")

class Ingredient(Base):
    __tablename__ = 'Ingredient'
    Ingredient_ID = db.Column(db.Integer, primary_key=True)
    Ingredient_Name = db.Column(db.String(150), nullable=False, unique=True)
    Unit_Of_Measure = db.Column(db.String(50), nullable=False)
    Category = db.Column(db.String(50), nullable=False)
    Notes = db.Column(db.String(255))
    Updated_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    # Relationships
    nutrition = relationship('Nutrition', uselist=False, back_populates='ingredient', cascade="all, delete-orphan")
    recipes = relationship('Recipe_Ingredient', back_populates='ingredient')

class Nutrition(Base):
    __tablename__ = 'Nutrition'
    Nutrition_ID = db.Column(db.Integer, primary_key=True)
    Ingredient_ID = db.Column(db.Integer, ForeignKey('Ingredient.Ingredient_ID', ondelete='CASCADE', onupdate='CASCADE'), nullable=False, unique=True)
    Calories = db.Column(DECIMAL(6, 2))
    Carbohydrates_g = db.Column(DECIMAL(6, 2), default=0)
    Protein_g = db.Column(DECIMAL(6, 2), default=0)
    Fat_g = db.Column(DECIMAL(6, 2), default=0)
    Fiber_g = db.Column(DECIMAL(6, 2), default=0)
    Vitamins = db.Column(db.String(255))
    Minerals = db.Column(db.String(255))
    Other_Nutrients = db.Column(db.Text)
    Updated_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    # Relationships
    ingredient = relationship('Ingredient', back_populates='nutrition')

class Recipe_Ingredient(Base):
    __tablename__ = 'Recipe_Ingredient'
    RecipeIngredient_ID = db.Column(db.Integer, primary_key=True)
    Recipe_ID = db.Column(db.Integer, ForeignKey('Recipe.Recipe_ID', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    Ingredient_ID = db.Column(db.Integer, ForeignKey('Ingredient.Ingredient_ID', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)
    Quantity = db.Column(DECIMAL(8, 3), nullable=False)
    Unit = db.Column(db.String(50), nullable=False)
    
    __table_args__ = (UniqueConstraint('Recipe_ID', 'Ingredient_ID'),)
    
    # Relationships
    recipe = relationship('Recipe', back_populates='ingredients')
    ingredient = relationship('Ingredient', back_populates='recipes')

class User_Diet_Log(Base):
    __tablename__ = 'User_Diet_Log'
    Log_ID = db.Column(db.Integer, primary_key=True)
    User_ID = db.Column(db.Integer, ForeignKey('User.User_ID', ondelete='CASCADE', onupdate='CASCADE'))
    Recipe_ID = db.Column(db.Integer, ForeignKey('Recipe.Recipe_ID', ondelete='SET NULL', onupdate='CASCADE'))
    Date = db.Column(DATE, nullable=False)
    Time = db.Column(TIME)
    Portion_Size = db.Column(DECIMAL(5, 2), default=1)
    Notes = db.Column(db.Text)
    is_finished = db.Column(db.Boolean, nullable=False, default=False)
    Created_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    Updated_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    # Relationships
    user = relationship('User', back_populates='diet_logs')
    recipe = relationship('Recipe', back_populates='diet_logs')

class Meal_Plan(Base):
    __tablename__ = 'Meal_Plan'
    MealPlan_ID = db.Column(db.Integer, primary_key=True)
    User_ID = db.Column(db.Integer, ForeignKey('User.User_ID', ondelete='CASCADE', onupdate='CASCADE'))
    Plan_Name = db.Column(db.String(150), nullable=False)
    Start_Date = db.Column(DATE)
    End_Date = db.Column(DATE)
    Notes = db.Column(db.Text)
    Created_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    Updated_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    # Relationships
    user = relationship('User', back_populates='meal_plans')
    recipes = relationship('MealPlan_Recipe', back_populates='meal_plan', cascade="all, delete-orphan")

class MealPlan_Recipe(Base):
    __tablename__ = 'MealPlan_Recipe'
    id = db.Column(db.Integer, primary_key=True)
    MealPlan_ID = db.Column(db.Integer, ForeignKey('Meal_Plan.MealPlan_ID', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    Recipe_ID = db.Column(db.Integer, ForeignKey('Recipe.Recipe_ID', ondelete='RESTRICT', onupdate='CASCADE'), nullable=False)
    Day_of_Plan = db.Column(DATE)
    Meal_Type = db.Column(Enum('Breakfast', 'Lunch', 'Dinner', 'Snack'), default='Lunch')
    
    # Relationships
    meal_plan = relationship('Meal_Plan', back_populates='recipes')
    recipe = relationship('Recipe', back_populates='meal_plans')

class Feedback(Base):
    __tablename__ = 'Feedback'
    Feedback_ID = db.Column(db.Integer, primary_key=True)
    User_ID = db.Column(db.Integer, ForeignKey('User.User_ID', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    Recipe_ID = db.Column(db.Integer, ForeignKey('Recipe.Recipe_ID', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    Rating = db.Column(db.SmallInteger, nullable=False)
    Comments = db.Column(db.Text)
    Date = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    Updated_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    # Relationships
    user = relationship('User', back_populates='feedback')
    recipe = relationship('Recipe', back_populates='feedback')

class User_Weight_History(Base):
    __tablename__ = 'User_Weight_History'
    History_ID = db.Column(db.Integer, primary_key=True)
    User_ID = db.Column(db.Integer, ForeignKey('User.User_ID', ondelete='CASCADE', onupdate='CASCADE'))
    Old_Weight = db.Column(DECIMAL(5, 2))
    New_Weight = db.Column(DECIMAL(5, 2))
    Updated_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    
    # Relationship
    user = relationship('User', back_populates='weight_history')

class Recipe_Log(Base):
    __tablename__ = 'Recipe_Log'
    Log_ID = db.Column(db.Integer, primary_key=True)
    Recipe_ID = db.Column(db.Integer, ForeignKey('Recipe.Recipe_ID', ondelete='CASCADE', onupdate='CASCADE'))
    Recipe_Name = db.Column(db.String(200))
    Created_By = db.Column(db.Integer, ForeignKey('User.User_ID', ondelete='SET NULL'))
    Created_At = db.Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

# =========================================================
# 3. ADMIN DECORATOR
# =========================================================

# --- NEW: Admin-Only Decorator ---
def admin_required():
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") == "admin":
                return fn(*args, **kwargs)
            else:
                return jsonify({"error": "Admins only!"}), 403
        return decorator
    return wrapper

# =========================================================
# 4. AUTHENTICATION ROUTES
# =========================================================

@app.route('/api/users', methods=['POST'])
def create_user():
    """SIGNUP Route."""
    data = request.json
    
    if User.query.filter_by(Email=data['Email']).first():
        return jsonify({"error": "Email already exists"}), 409

    hashed_password = bcrypt.generate_password_hash(data['Password']).decode('utf-8')

    new_user = User(
        Name=data['Name'],
        Email=data['Email'],
        Password=hashed_password,
        Date_Of_Birth=data.get('Date_Of_Birth'),
        Gender=data.get('Gender'),
        Height_cm=data.get('Height_cm'),
        Weight_kg=data.get('Weight_kg'),
        Activity_Level=data.get('Activity_Level'),
        Dietary_Preferences=data.get('Dietary_Preferences'),
        Allergies=data.get('Allergies')
        # 'role' defaults to 'user' automatically
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify(new_user.to_dict(exclude=['Password'])), 201

@app.route('/api/login', methods=['POST'])
def login_user():
    """LOGIN Route."""
    data = request.json
    email = data.get('Email')
    password = data.get('Password')
    
    user = User.query.filter_by(Email=email).first()
    
    if user and bcrypt.check_password_hash(user.Password, password):
        # --- TOKEN EXPIRY FIX ---
        expires = datetime.timedelta(days=7)
        access_token = create_access_token(
            identity=user.User_ID, 
            expires_delta=expires,
            additional_claims={"role": user.role} # Add role to token
        )
        # --- END FIX ---
        
        # Return role so frontend can save it
        return jsonify(access_token=access_token, user_id=user.User_ID, role=user.role)
    
    return jsonify({"error": "Invalid email or password"}), 401

# =========================================================
# 5. API ROUTES (USER & ADMIN)
# =========================================================

# --- User CRUD (for a user to manage THEMSELVES) ---
@app.route('/api/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    current_user_id = get_jwt_identity()
    if current_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict(exclude=['Password']))

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user_id = get_jwt_identity()
    if current_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    data = request.json
    user.Name = data.get('Name', user.Name)
    user.Email = data.get('Email', user.Email)
    user.Date_Of_Birth = data.get('Date_Of_Birth', user.Date_Of_Birth)
    user.Gender = data.get('Gender', user.Gender)
    user.Height_cm = data.get('Height_cm', user.Height_cm)
    user.Weight_kg = data.get('Weight_kg', user.Weight_kg)
    user.Activity_Level = data.get('Activity_Level', user.Activity_Level)
    user.Dietary_Preferences = data.get('Dietary_Preferences', user.Dietary_Preferences)
    user.Allergies = data.get('Allergies', user.Allergies)
    
    db.session.commit()
    return jsonify(user.to_dict(exclude=['Password']))

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    if current_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200

# --- NEW: Admin-only User Management Routes ---
@app.route('/api/admin/users', methods=['GET'])
@admin_required()
def get_all_users():
    users = User.query.all()
    return jsonify([user.to_dict(exclude=['Password']) for user in users])

@app.route('/api/admin/users/<int:user_id>', methods=['GET'])
@admin_required()
def admin_get_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict(exclude=['Password']))

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@admin_required()
def admin_update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    data = request.json
    user.Name = data.get('Name', user.Name)
    user.Email = data.get('Email', user.Email)
    user.Date_Of_Birth = data.get('Date_Of_Birth', user.Date_Of_Birth)
    user.Gender = data.get('Gender', user.Gender)
    user.Height_cm = data.get('Height_cm', user.Height_cm)
    user.Weight_kg = data.get('Weight_kg', user.Weight_kg)
    user.Activity_Level = data.get('Activity_Level', user.Activity_Level)
    user.Dietary_Preferences = data.get('Dietary_Preferences', user.Dietary_Preferences)
    user.Allergies = data.get('Allergies', user.Allergies)
    user.role = data.get('role', user.role) # <-- Admin can change role
    
    db.session.commit()
    return jsonify(user.to_dict(exclude=['Password']))

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required()
def admin_delete_user(user_id):
    # Prevent admin from deleting themselves
    current_admin_id = get_jwt_identity()
    if current_admin_id == user_id:
        return jsonify({"error": "Admin cannot delete their own account."}), 403

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete user. Database error: {str(e)}"}), 500

# --- NEW: Admin Password Reset Route ---
@app.route('/api/admin/users/<int:user_id>/reset-password', methods=['POST'])
@admin_required()
def admin_reset_password(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    data = request.json
    new_password = data.get('new_password')
    if not new_password:
        return jsonify({"error": "New password is required"}), 400
        
    # Hash the new password and save it
    user.Password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()
    
    return jsonify({"message": f"Password for {user.Email} has been reset."})

# --- NEW: Admin Analytics Route ---
@app.route('/api/admin/statistics', methods=['GET'])
@admin_required()
def get_admin_statistics():
    try:
        # Call the new procedure
        result_proxy = db.session.execute(text("CALL GetAdminStatistics()"))
        
        stats = {}
        for row in result_proxy:
            # Manually convert keys/values
            metric = str(row[0])
            value = row[1]
            stats[metric] = value
            
        # Handle case where there are no logged recipes yet
        if 'most_popular_recipe' not in stats:
            stats['most_popular_recipe'] = 'N/A'

        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# --- Recipe CRUD (Admin can edit/delete any recipe) ---
@app.route('/api/recipes', methods=['POST'])
@jwt_required()
def create_recipe():
    data = request.json
    creator_id = get_jwt_identity()
    
    new_recipe = Recipe(
        Recipe_Name=data['Recipe_Name'],
        Description=data.get('Description'),
        Cuisine_Type=data.get('Cuisine_Type'),
        Preparation_Time_minutes=data.get('Preparation_Time_minutes'),
        Cooking_Time_minutes=data.get('Cooking_Time_minutes'),
        Serving_Size=data.get('Serving_Size', 1),
        Difficulty_Level=data.get('Difficulty_Level'),
        Instructions=data.get('Instructions'),
        Creator_User_ID=creator_id
    )
    db.session.add(new_recipe)
    db.session.commit()
    return jsonify(new_recipe.to_dict()), 201

@app.route('/api/recipes', methods=['GET'])
@jwt_required() 
def get_recipes():
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") == 'admin':
        recipes = Recipe.query.all() # Admin gets all recipes
    else:
        user_id = get_jwt_identity()
        recipes = Recipe.query.filter_by(Creator_User_ID=user_id).all() # User gets only their own
        
    return jsonify([recipe.to_dict() for recipe in recipes])

@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
@jwt_required()
def get_recipe(recipe_id):
    recipe = Recipe.query.options(
        joinedload(Recipe.ingredients).joinedload(Recipe_Ingredient.ingredient)
    ).get(recipe_id)
    
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404
    
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and recipe.Creator_User_ID != get_jwt_identity():
         return jsonify({"error": "Unauthorized"}), 403

    recipe_data = recipe.to_dict()
    recipe_data['ingredients'] = [
        {
            "RecipeIngredient_ID": ri.RecipeIngredient_ID,
            "Ingredient_ID": ri.Ingredient_ID,
            "Ingredient_Name": ri.ingredient.Ingredient_Name,
            "Quantity": float(ri.Quantity),
            "Unit": ri.Unit
        } for ri in recipe.ingredients
    ]
    return jsonify(recipe_data)

@app.route('/api/recipes/<int:recipe_id>', methods=['PUT'])
@jwt_required()
def update_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404
    
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and recipe.Creator_User_ID != get_jwt_identity():
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    
    # --- THIS IS THE FIX for AttributeError ---
    # Do NOT loop. Explicitly set the fields you want to update.
    recipe.Recipe_Name = data.get('Recipe_Name', recipe.Recipe_Name)
    recipe.Description = data.get('Description', recipe.Description)
    recipe.Cuisine_Type = data.get('Cuisine_Type', recipe.Cuisine_Type)
    recipe.Preparation_Time_minutes = data.get('Preparation_Time_minutes', recipe.Preparation_Time_minutes)
    recipe.Cooking_Time_minutes = data.get('Cooking_Time_minutes', recipe.Cooking_Time_minutes)
    recipe.Serving_Size = data.get('Serving_Size', recipe.Serving_Size)
    recipe.Difficulty_Level = data.get('Difficulty_Level', recipe.Difficulty_Level)
    recipe.Instructions = data.get('Instructions', recipe.Instructions)
    # We specifically DO NOT update 'ingredients' or 'Creator_User_ID' here.
    # --- END OF FIX ---
            
    db.session.commit()
    return jsonify(recipe.to_dict())

@app.route('/api/recipes/<int:recipe_id>', methods=['DELETE'])
@jwt_required()
def delete_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and recipe.Creator_User_ID != get_jwt_identity():
        return jsonify({"error": "Unauthorized"}), 403
    
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({"message": "Recipe deleted"}), 200

# --- Ingredient CRUD (Admins only) ---
@app.route('/api/ingredients', methods=['POST'])
@admin_required() # <-- Only admins can create ingredients
def create_ingredient():
    data = request.json
    new_ing = Ingredient(
        Ingredient_Name=data['Ingredient_Name'],
        Unit_Of_Measure=data['Unit_Of_Measure'],
        Category=data['Category'],
        Notes=data.get('Notes')
    )
    db.session.add(new_ing)
    db.session.commit()
    
    if 'nutrition' in data:
        nut_data = data['nutrition']
        new_nut = Nutrition(
            Ingredient_ID=new_ing.Ingredient_ID,
            Calories=nut_data.get('Calories'),
            Carbohydrates_g=nut_data.get('Carbohydrates_g'),
            Protein_g=nut_data.get('Protein_g'),
            Fat_g=nut_data.get('Fat_g'),
            Fiber_g=nut_data.get('Fiber_g'),
            Vitamins=nut_data.get('Vitamins'),
            Minerals=nut_data.get('Minerals'),
            Other_Nutrients=nut_data.get('Other_Nutrients')
        )
        db.session.add(new_nut)
        db.session.commit()
        
    return jsonify(new_ing.to_dict()), 201

@app.route('/api/ingredients', methods=['GET'])
@jwt_required() # All logged-in users can see ingredients
def get_ingredients():
    ingredients = Ingredient.query.options(joinedload(Ingredient.nutrition)).all()
    
    results = []
    for ing in ingredients:
        ing_data = ing.to_dict()
        ing_data['nutrition'] = ing.nutrition.to_dict() if ing.nutrition else None
        results.append(ing_data)
        
    return jsonify(results)

@app.route('/api/ingredients/<int:ing_id>', methods=['GET'])
@jwt_required() # All logged-in users can see a single ingredient
def get_ingredient(ing_id):
    ingredient = Ingredient.query.options(
        joinedload(Ingredient.nutrition)
    ).get(ing_id)
    
    if not ingredient:
        return jsonify({"error": "Ingredient not found"}), 404
    
    ing_data = ingredient.to_dict()
    ing_data['nutrition'] = ingredient.nutrition.to_dict() if ingredient.nutrition else None
    return jsonify(ing_data)

@app.route('/api/ingredients/<int:ing_id>', methods=['PUT'])
@admin_required() # <-- Only admins can change ingredients
def update_ingredient(ing_id):
    ingredient = db.session.get(Ingredient, ing_id)
    if not ingredient:
        return jsonify({"error": "Ingredient not found"}), 404
    
    data = request.json
    ingredient.Ingredient_Name = data.get('Ingredient_Name', ingredient.Ingredient_Name)
    ingredient.Unit_Of_Measure = data.get('Unit_Of_Measure', ingredient.Unit_Of_Measure)
    ingredient.Category = data.get('Category', ingredient.Category)
    ingredient.Notes = data.get('Notes', ingredient.Notes)
    
    if 'nutrition' in data:
        if not ingredient.nutrition:
            ingredient.nutrition = Nutrition(Ingredient_ID=ing_id)
            db.session.add(ingredient.nutrition)
            
        nut_data = data['nutrition']
        for key, value in nut_data.items():
            if hasattr(ingredient.nutrition, key):
                setattr(ingredient.nutrition, key, value)
    
    db.session.commit()
    
    ingredient = Ingredient.query.options(joinedload(Ingredient.nutrition)).get(ing_id)
    ing_data = ingredient.to_dict()
    ing_data['nutrition'] = ingredient.nutrition.to_dict() if ingredient.nutrition else None
    
    return jsonify(ing_data)


@app.route('/api/ingredients/<int:ing_id>', methods=['DELETE'])
@admin_required() # <-- Only admins can delete ingredients
def delete_ingredient(ing_id):
    ingredient = db.session.get(Ingredient, ing_id)
    if not ingredient:
        return jsonify({"error": "Ingredient not found"}), 404
        
    try:
        db.session.delete(ingredient)
        db.session.commit()
        return jsonify({"message": "Ingredient deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Cannot delete: Ingredient is in use by a recipe. " + str(e)}), 409


# --- Meal_Plan CRUD (User-specific OR Admin) ---
@app.route('/api/mealplans', methods=['POST'])
@jwt_required()
def create_mealplan():
    data = request.json
    user_id = get_jwt_identity()
    
    new_plan = Meal_Plan(
        User_ID=user_id,
        Plan_Name=data['Plan_Name'],
        Start_Date=data.get('Start_Date'),
        End_Date=data.get('End_Date'),
        Notes=data.get('Notes')
    )
    db.session.add(new_plan)
    db.session.commit()
    return jsonify(new_plan.to_dict()), 201

@app.route('/api/mealplans', methods=['GET'])
@jwt_required()
def get_mealplans():
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") == 'admin':
        plans = Meal_Plan.query.all() # Admin gets all meal plans
    else:
        user_id = get_jwt_identity()
        plans = Meal_Plan.query.filter_by(User_ID=user_id).all() # User gets only their own
        
    return jsonify([plan.to_dict() for plan in plans])

@app.route('/api/mealplans/<int:plan_id>', methods=['GET'])
@jwt_required()
def get_mealplan(plan_id):
    user_id = get_jwt_identity()
    
    plan = Meal_Plan.query.options(
        joinedload(Meal_Plan.recipes).joinedload(MealPlan_Recipe.recipe)
    ).filter_by(MealPlan_ID=plan_id).first() # Get plan by ID first
    
    if not plan:
        return jsonify({"error": "Meal plan not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and plan.User_ID != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    plan_data = plan.to_dict()
    plan_data['recipes'] = [
        {
            "MealPlan_Recipe_ID": mpr.id,
            "Recipe_ID": mpr.Recipe_ID,
            "Recipe_Name": mpr.recipe.Recipe_Name,
            "Day_of_Plan": mpr.Day_of_Plan.isoformat() if mpr.Day_of_Plan else None,
            "Meal_Type": mpr.Meal_Type
        } for mpr in plan.recipes
    ]
    return jsonify(plan_data)

@app.route('/api/mealplans/<int:plan_id>', methods=['PUT'])
@jwt_required()
def update_mealplan(plan_id):
    user_id = get_jwt_identity()
    plan = db.session.get(Meal_Plan, plan_id)

    if not plan:
        return jsonify({"error": "Meal plan not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and plan.User_ID != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    plan.Plan_Name = data.get('Plan_Name', plan.Plan_Name)
    plan.Start_Date = data.get('Start_Date', plan.Start_Date)
    plan.End_Date = data.get('End_Date', plan.End_Date)
    plan.Notes = data.get('Notes', plan.Notes)
    
    db.session.commit()
    return jsonify(plan.to_dict())

@app.route('/api/mealplans/<int:plan_id>', methods=['DELETE'])
@jwt_required()
def delete_mealplan(plan_id):
    user_id = get_jwt_identity()
    plan = db.session.get(Meal_Plan, plan_id)

    if not plan:
        return jsonify({"error": "Meal plan not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and plan.User_ID != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    db.session.delete(plan)
    db.session.commit()
    return jsonify({"message": "Meal plan deleted"}), 200

# =========================================================
# 6. RELATIONSHIP ROUTES (Junction Tables)
# =========================================================

# --- Manage Ingredients IN a Recipe (Recipe_Ingredient) ---
@app.route('/api/recipes/<int:recipe_id>/ingredients', methods=['POST'])
@jwt_required()
def add_ingredient_to_recipe(recipe_id):
    data = request.json
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404
    
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and recipe.Creator_User_ID != get_jwt_identity():
        return jsonify({"error": "Unauthorized"}), 403
        
    if not db.session.get(Ingredient, data['Ingredient_ID']):
        return jsonify({"error": "Ingredient not found"}), 404
        
    new_ri = Recipe_Ingredient(
        Recipe_ID=recipe_id,
        Ingredient_ID=data['Ingredient_ID'],
        Quantity=data['Quantity'],
        Unit=data['Unit']
    )
    db.session.add(new_ri)
    db.session.commit()
    return jsonify(new_ri.to_dict()), 201

@app.route('/api/recipe-ingredients/<int:ri_id>', methods=['PUT'])
@jwt_required()
def update_ingredient_in_recipe(ri_id):
    ri = db.session.get(Recipe_Ingredient, ri_id)
    if not ri:
        return jsonify({"error": "Recipe ingredient entry not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and ri.recipe.Creator_User_ID != get_jwt_identity():
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    ri.Quantity = data.get('Quantity', ri.Quantity)
    ri.Unit = data.get('Unit', ri.Unit)
    db.session.commit()
    return jsonify(ri.to_dict())

@app.route('/api/recipe-ingredients/<int:ri_id>', methods=['DELETE'])
@jwt_required()
def delete_ingredient_from_recipe(ri_id):
    ri = db.session.get(Recipe_Ingredient, ri_id)
    if not ri:
        return jsonify({"error": "Recipe ingredient entry not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and ri.recipe.Creator_User_ID != get_jwt_identity():
        return jsonify({"error": "Unauthorized"}), 403
        
    db.session.delete(ri)
    db.session.commit()
    return jsonify({"message": "Ingredient removed from recipe"}), 200


# --- Manage Recipes IN a Meal Plan (MealPlan_Recipe) ---
@app.route('/api/mealplans/<int:plan_id>/recipes', methods=['POST'])
@jwt_required()
def add_recipe_to_mealplan(plan_id):
    data = request.json
    user_id = get_jwt_identity()
    
    plan = Meal_Plan.query.filter_by(MealPlan_ID=plan_id, User_ID=user_id).first()
    
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") == 'admin':
        plan = db.session.get(Meal_Plan, plan_id) # Admin can add to any plan
        
    if not plan:
        return jsonify({"error": "Meal plan not found or unauthorized"}), 404
        
    if not db.session.get(Recipe, data['Recipe_ID']):
        return jsonify({"error": "Recipe not found"}), 404
        
    new_mpr = MealPlan_Recipe(
        MealPlan_ID=plan_id,
        Recipe_ID=data['Recipe_ID'],
        Day_of_Plan=data.get('Day_of_Plan'),
        Meal_Type=data.get('Meal_Type')
    )
    db.session.add(new_mpr)
    db.session.commit()
    return jsonify(new_mpr.to_dict()), 201
    
@app.route('/api/mealplan-recipes/<int:mpr_id>', methods=['DELETE'])
@jwt_required()
def remove_recipe_from_mealplan(mpr_id):
    mpr = db.session.get(MealPlan_Recipe, mpr_id)
    if not mpr:
        return jsonify({"error": "Meal plan recipe entry not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and mpr.meal_plan.User_ID != get_jwt_identity():
        return jsonify({"error": "Unauthorized"}), 403
        
    db.session.delete(mpr)
    db.session.commit()
    return jsonify({"message": "Recipe removed from meal plan"}), 200

# =========================================================
# 7. SPECIAL ROUTES (Calling Procedures & Functions)
# =========================================================

@app.route('/api/users/<int:user_id>/weight', methods=['PUT'])
@jwt_required()
def call_update_user_weight(user_id):
    """Calls 'UpdateUserWeight' stored procedure."""
    current_user_id = get_jwt_identity()
    
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and current_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    new_weight = data.get('weight')
    
    if not new_weight:
        return jsonify({"error": "New weight is required"}), 400
        
    try:
        db.session.execute(
            text("CALL UpdateUserWeight(:id, :weight)"),
            {"id": user_id, "weight": new_weight}
        )
        db.session.commit()
        return jsonify({"message": f"User {user_id} weight updated to {new_weight}"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/api/users/<int:user_id>/weight-history', methods=['GET'])
@jwt_required()
def get_user_weight_history(user_id):
    """Fetches User_Weight_History for a user."""
    current_user_id = get_jwt_identity()
    
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and current_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    history = User_Weight_History.query.filter_by(User_ID=user_id).order_by(User_Weight_History.Updated_At.desc()).all()
    return jsonify([h.to_dict() for h in history])

@app.route('/api/recipes/<int:recipe_id>/calories', methods=['GET'])
@jwt_required()
def call_get_recipe_calories(recipe_id):
    """Calls 'GetRecipeCalories' SQL function."""
    try:
        result = db.session.execute(
            text("SELECT GetRecipeCalories(:id)"),
            {"id": recipe_id}
        ).scalar()

        return jsonify({
            "Recipe_ID": recipe_id,
            "Total_Calories": float(result) if result is not None else 0
        })
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/api/mealplans/<int:plan_id>/summary', methods=['GET'])
@jwt_required()
def call_get_mealplan_summary(plan_id):
    """Calls 'GetMealPlanSummary' procedure for a specific plan."""
    user_id = get_jwt_identity()
    
    plan = db.session.get(Meal_Plan, plan_id)
    if not plan:
        return jsonify({"error": "Plan not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and plan.User_ID != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        # The procedure is already filtered by user ID, so we use the plan's owner ID
        result_proxy = db.session.execute(
            text("CALL GetMealPlanSummary(:id)"),
            {"id": plan.User_ID} 
        )
        
        summary_for_plan = [
            {
                "Plan_Name": row.Plan_Name,
                "Day_of_Plan": row.Day_of_Plan.isoformat(),
                "Meal_Type": row.Meal_Type,
                "Recipe_Name": row.Recipe_Name,
                "Recipe_Calories": float(row.Recipe_Calories)
            } for row in result_proxy if row.Plan_Name == plan.Plan_Name
        ]
        
        return jsonify(summary_for_plan)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

# =========================================================
# 8. DIET LOG, FEEDBACK & ANALYSIS ROUTES
# =========================================================

# --- Diet Log Routes ---
@app.route('/api/dietlogs', methods=['POST'])
@jwt_required()
def add_diet_log():
    user_id = get_jwt_identity()
    data = request.json
    
    new_log = User_Diet_Log(
        User_ID=user_id,
        Recipe_ID=data.get('Recipe_ID'),
        Date=data['Date'],
        Time=data.get('Time'),
        Portion_Size=data.get('Portion_Size', 1),
        Notes=data.get('Notes'),
        is_finished=data.get('is_finished', False)
    )
    db.session.add(new_log)
    db.session.commit()
    return jsonify(new_log.to_dict()), 201

@app.route('/api/dietlogs', methods=['GET'])
@jwt_required()
def get_diet_logs():
    user_id = get_jwt_identity()
    
    date_filter = request.args.get('date')
    
    query = db.session.query(User_Diet_Log, Recipe.Recipe_Name)\
        .outerjoin(Recipe, User_Diet_Log.Recipe_ID == Recipe.Recipe_ID)\
        .filter(User_Diet_Log.User_ID == user_id)
        
    if date_filter:
        try:
            date_obj = datetime.datetime.strptime(date_filter, '%Y-%m-%d').date()
            query = query.filter(User_Diet_Log.Date == date_obj)
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    
    logs = query.order_by(User_Diet_Log.Date.desc(), User_Diet_Log.Time.desc()).all()
    
    result = []
    for log, recipe_name in logs:
        log_data = log.to_dict()
        log_data['Recipe_Name'] = recipe_name or 'Unknown Recipe'
        result.append(log_data)
        
    return jsonify(result)

@app.route('/api/dietlogs/<int:log_id>', methods=['PUT'])
@jwt_required()
def update_diet_log(log_id):
    user_id = get_jwt_identity()
    log = db.session.get(User_Diet_Log, log_id)
    
    if not log:
        return jsonify({"error": "Log not found"}), 404
    
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and log.User_ID != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    log.Recipe_ID = data.get('Recipe_ID', log.Recipe_ID)
    log.Date = data.get('Date', log.Date)
    log.Time = data.get('Time', log.Time)
    log.Portion_Size = data.get('Portion_Size', log.Portion_Size)
    log.Notes = data.get('Notes', log.Notes)
    
    db.session.commit()
    return jsonify(log.to_dict())

@app.route('/api/dietlogs/<int:log_id>', methods=['DELETE'])
@jwt_required()
def delete_diet_log(log_id):
    user_id = get_jwt_identity()
    log = db.session.get(User_Diet_Log, log_id)
    
    if not log:
        return jsonify({"error": "Log not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and log.User_ID != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    db.session.delete(log)
    db.session.commit()
    return jsonify({"message": "Log deleted"}), 200

@app.route('/api/dietlogs/<int:log_id>/toggle', methods=['PUT'])
@jwt_required()
def toggle_diet_log(log_id):
    user_id = get_jwt_identity()
    log = db.session.get(User_Diet_Log, log_id)
    
    if not log:
        return jsonify({"error": "Log not found"}), 404
    
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and log.User_ID != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    log.is_finished = not log.is_finished
    db.session.commit()
    
    return jsonify(log.to_dict())


# --- Feedback Routes ---
@app.route('/api/recipes/<int:recipe_id>/feedback', methods=['POST'])
@jwt_required()
def add_feedback(recipe_id):
    user_id = get_jwt_identity()
    data = request.json
    
    if not db.session.get(Recipe, recipe_id):
        return jsonify({"error": "Recipe not found"}), 404
        
    try:
        db.session.execute(
            text("CALL AddFeedback(:p_userId, :p_recipeId, :p_rating, :p_comments)"),
            {
                "p_userId": user_id,
                "p_recipeId": recipe_id,
                "p_rating": data['Rating'],
                "p_comments": data.get('Comments')
            }
        )
        db.session.commit()
        return jsonify({"message": "Feedback added successfully"}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/api/recipes/<int:recipe_id>/feedback', methods=['GET'])
@jwt_required()
def get_feedback(recipe_id):
    feedback_list = db.session.query(Feedback, User.Name)\
        .join(User, Feedback.User_ID == User.User_ID)\
        .filter(Feedback.Recipe_ID == recipe_id)\
        .order_by(Feedback.Date.desc())\
        .all()
        
    result = []
    for feedback, user_name in feedback_list:
        fb_data = feedback.to_dict()
        fb_data['User_Name'] = user_name
        result.append(fb_data)
        
    return jsonify(result)

@app.route('/api/feedback/<int:feedback_id>', methods=['PUT'])
@jwt_required()
def update_feedback(feedback_id):
    user_id = get_jwt_identity()
    feedback = db.session.get(Feedback, feedback_id)
    
    if not feedback:
        return jsonify({"error": "Feedback not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and feedback.User_ID != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    feedback.Rating = data.get('Rating', feedback.Rating)
    feedback.Comments = data.get('Comments', feedback.Comments)
    db.session.commit()
    return jsonify(feedback.to_dict())

@app.route('/api/feedback/<int:feedback_id>', methods=['DELETE'])
@jwt_required()
def delete_feedback(feedback_id):
    user_id = get_jwt_identity()
    feedback = db.session.get(Feedback, feedback_id)
    
    if not feedback:
        return jsonify({"error": "Feedback not found"}), 404
        
    # --- ADMIN OVERRIDE ---
    claims = get_jwt()
    if claims.get("role") != 'admin' and feedback.User_ID != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    db.session.delete(feedback)
    db.session.commit()
    return jsonify({"message": "Feedback deleted"}), 200

# --- Nutritional Analysis Route ---
@app.route('/api/dietlogs/summary', methods=['GET'])
@jwt_required()
def get_dietlog_summary():
    user_id = get_jwt_identity()
    
    days_param = request.args.get('days', 7, type=int)
    days = max(1, days_param) 
    
    start_date = datetime.date.today() - datetime.timedelta(days=days - 1)
    end_date = datetime.date.today()

    summary = (db.session.query(
        func.sum(Nutrition.Calories * (Recipe_Ingredient.Quantity / 100) * User_Diet_Log.Portion_Size).label('total_calories'),
        func.sum(Nutrition.Protein_g * (Recipe_Ingredient.Quantity / 100) * User_Diet_Log.Portion_Size).label('total_protein'),
        func.sum(Nutrition.Carbohydrates_g * (Recipe_Ingredient.Quantity / 100) * User_Diet_Log.Portion_Size).label('total_carbs'),
        func.sum(Nutrition.Fat_g * (Recipe_Ingredient.Quantity / 100) * User_Diet_Log.Portion_Size).label('total_fat'),
        func.sum(Nutrition.Fiber_g * (Recipe_Ingredient.Quantity / 100) * User_Diet_Log.Portion_Size).label('total_fiber')
    )
    .select_from(User_Diet_Log)
    .join(Recipe, User_Diet_Log.Recipe_ID == Recipe.Recipe_ID)
    .join(Recipe_Ingredient, Recipe.Recipe_ID == Recipe_Ingredient.Recipe_ID)
    .join(Ingredient, Recipe_Ingredient.Ingredient_ID == Ingredient.Ingredient_ID)
    .join(Nutrition, Ingredient.Ingredient_ID == Nutrition.Ingredient_ID)
    .filter(User_Diet_Log.User_ID == user_id)
    .filter(User_Diet_Log.Date.between(start_date, end_date))
    .filter(User_Diet_Log.is_finished == True)
    .first())
    
    result = {
        'days': days,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_calories': float(summary.total_calories or 0),
        'total_protein': float(summary.total_protein or 0),
        'total_carbs': float(summary.total_carbs or 0),
        'total_fat': float(summary.total_fat or 0),
        'total_fiber': float(summary.total_fiber or 0)
    }
    
    return jsonify(result)

# --- NEW: Route to get Recipe_Log activity ---
@app.route('/api/recipe-log', methods=['GET'])
@jwt_required()
def get_recipe_log():
    user_id = get_jwt_identity()
    
    logs = Recipe_Log.query.filter_by(Created_By=user_id)\
        .order_by(Recipe_Log.Created_At.desc())\
        .limit(10)\
        .all()
        
    return jsonify([log.to_dict() for log in logs])

# --- NEW: Route to log a full meal plan day ---
@app.route('/api/mealplans/log-day', methods=['POST'])
@jwt_required()
def log_meal_plan_day():
    user_id = get_jwt_identity()
    data = request.json
    plan_id = data.get('plan_id')
    date_to_log = data.get('date')

    if not plan_id or not date_to_log:
        return jsonify({"error": "plan_id and date are required"}), 400
    
    plan = db.session.get(Meal_Plan, plan_id)
    if not plan or plan.User_ID != user_id:
        return jsonify({"error": "Plan not found or unauthorized"}), 403

    try:
        recipes_for_day = MealPlan_Recipe.query.filter_by(
            MealPlan_ID=plan_id,
            Day_of_Plan=date_to_log
        ).join(Meal_Plan).filter(Meal_Plan.User_ID == user_id).all()
        
        if not recipes_for_day:
            return jsonify({"error": "No recipes found for this day on this plan."}), 404
            
        new_logs = []
        for item in recipes_for_day:
            new_log = User_Diet_Log(
                User_ID=user_id,
                Recipe_ID=item.Recipe_ID,
                Date=item.Day_of_Plan,
                Portion_Size=1, # Default to 1 portion
                Notes=f"From meal plan: {plan.Plan_Name}",
                is_finished=True # Mark as finished since they are logging it
            )
            db.session.add(new_log)
            new_logs.append(new_log)
            
        db.session.commit()
        return jsonify({"message": f"Successfully logged {len(new_logs)} meals."}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
        
# =========================================================
# 9. RUN THE APPLICATION
# =========================================================
if __name__ == '__main__':
    app.run(debug=True)