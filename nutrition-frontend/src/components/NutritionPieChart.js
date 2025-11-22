import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

// Register the components Chart.js needs
ChartJS.register(ArcElement, Tooltip, Legend);

// This component calculates and renders the pie chart
const NutritionPieChart = ({ summaryData }) => {
    // 1. Convert grams to calories
    // 1g Protein = 4 calories
    // 1g Carbs = 4 calories
    // 1g Fat = 9 calories
    const proteinCalories = (summaryData.total_protein || 0) * 4;
    const carbsCalories = (summaryData.total_carbs || 0) * 4;
    const fatCalories = (summaryData.total_fat || 0) * 9;

    // 2. Get total calories from these macros
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

    // 3. Handle the "no data" case
    if (totalMacroCalories === 0) {
        return <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '2rem' }}>No data to display chart.</p>;
    }

    // 4. Prepare data for the pie chart
    const chartData = {
        labels: [
            `Protein (${proteinCalories.toFixed(0)} kcal)`, 
            `Carbs (${carbsCalories.toFixed(0)} kcal)`, 
            `Fat (${fatCalories.toFixed(0)} kcal)`
        ],
        datasets: [
            {
                label: 'Calorie Distribution',
                // This calculates the percentage for the chart
                data: [proteinCalories, carbsCalories, fatCalories],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.8)', // Blue (Protein)
                    'rgba(75, 192, 192, 0.8)', // Green (Carbs)
                    'rgba(255, 206, 86, 0.8)', // Yellow (Fat)
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 206, 86, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    // This customizes the tooltip
                    label: function (tooltipItem) {
                        const total = tooltipItem.dataset.data.reduce((acc, val) => acc + val, 0);
                        const value = tooltipItem.raw;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${tooltipItem.label.split('(')[0]}: ${percentage}%`;
                    }
                }
            }
        },
    };

    return <Pie data={chartData} options={options} />;
};

export default NutritionPieChart;