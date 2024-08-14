import React, { useState, useEffect, useContext } from 'react';
import { Line } from 'react-chartjs-2';
import { AuthContext } from '../context/AuthContext';
import { Filler } from 'chart.js';
import dayjs from 'dayjs';

const Dashboard = () => {
    const { auth } = useContext(AuthContext);
    const [initialBalance, setInitialBalance] = useState('');
    const [equityData, setEquityData] = useState([]);
    const [equityCurve, setEquityCurve] = useState([]);
    const [isBalanceSet, setIsBalanceSet] = useState(false);
    const [dateLabels, setDateLabels] = useState([]);

    useEffect(() => {
        const savedBalanceSet = localStorage.getItem('balanceSet') === 'true';
        const savedInitialBalance = localStorage.getItem('initialBalance');
        const savedEquityCurve = JSON.parse(localStorage.getItem('equityCurve'));
        const savedDateLabels = JSON.parse(localStorage.getItem('dateLabels'));

        if (savedBalanceSet && savedInitialBalance && savedEquityCurve && savedDateLabels) {
            setInitialBalance(savedInitialBalance);
            setEquityCurve(savedEquityCurve);
            setDateLabels(savedDateLabels);
            setIsBalanceSet(true);
        }

        if (auth.token) {
            fetchTrades();
        }
    }, [auth.token]);

    const fetchTrades = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/trades', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.token}`,
                },
            });

            const data = await response.json();
            setEquityData(data);
            if (isBalanceSet && initialBalance) {
                const curveAndLabels = calculateEquityCurveAndLabels(data, parseFloat(initialBalance));
                setEquityCurve(curveAndLabels.curve);
                setDateLabels(curveAndLabels.labels);
                localStorage.setItem('equityCurve', JSON.stringify(curveAndLabels.curve));
                localStorage.setItem('dateLabels', JSON.stringify(curveAndLabels.labels));
            }
        } catch (error) {
            console.error('Error fetching trades:', error);
        }
    };

    const calculateEquityCurveAndLabels = (trades, balance) => {
        let equity = [balance];
        let labels = [];
        let currentDate = dayjs(trades[0].date); // Start from the first trade date

        trades.forEach(trade => {
            const tradeDate = dayjs(trade.date);

            // Fill missing dates
            while (currentDate.isBefore(tradeDate)) {
                labels.push(currentDate.format('YYYY-MM-DD'));
                equity.push(equity[equity.length - 1]); // Carry forward the balance
                currentDate = currentDate.add(1, 'day');
            }

            const newBalance = equity[equity.length - 1] + trade.pnl;
            equity.push(newBalance);
            labels.push(tradeDate.format('YYYY-MM-DD'));
            currentDate = tradeDate.add(1, 'day');
        });

        // Fill remaining dates until today
        const today = dayjs();
        while (currentDate.isBefore(today) || currentDate.isSame(today, 'day')) {
            labels.push(currentDate.format('YYYY-MM-DD'));
            equity.push(equity[equity.length - 1]);
            currentDate = currentDate.add(1, 'day');
        }

        return { curve: equity, labels };
    };

    const handleInitialBalanceChange = (e) => {
        setInitialBalance(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (initialBalance) {
            const curveAndLabels = calculateEquityCurveAndLabels(equityData, parseFloat(initialBalance));
            setEquityCurve(curveAndLabels.curve);
            setDateLabels(curveAndLabels.labels);
            setIsBalanceSet(true);
            localStorage.setItem('balanceSet', 'true');
            localStorage.setItem('initialBalance', initialBalance);
            localStorage.setItem('equityCurve', JSON.stringify(curveAndLabels.curve));
            localStorage.setItem('dateLabels', JSON.stringify(curveAndLabels.labels));
        }
    };

    const handleReset = () => {
        setInitialBalance('');
        setEquityCurve([]);
        setDateLabels([]);
        setIsBalanceSet(false);
        localStorage.removeItem('balanceSet');
        localStorage.removeItem('initialBalance');
        localStorage.removeItem('equityCurve');
        localStorage.removeItem('dateLabels');
    };

    return (
        <div className="dashboard flex flex-col h-full w-full px-10">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

            {!isBalanceSet ? (
                <div className="mb-6">
                    <form onSubmit={handleSubmit}>
                        <label className="block text-lg font-medium mb-2">Initial Balance:</label>
                        <input
                            type="number"
                            value={initialBalance}
                            onChange={handleInitialBalanceChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Enter your initial balance"
                        />
                        <button
                            type="submit"
                            className="mt-2 bg-primary text-white py-2 px-4 rounded-lg"
                        >
                            Set Initial Balance
                        </button>
                    </form>
                </div>
            ) : (
                <div className="flex justify-end mb-6 py-0">
                    <button
                        onClick={handleReset}
                        className="bg-red-500 text-white py-2 px-4 rounded-lg"
                    >
                        Reset
                    </button>
                </div>
            )}

            {equityCurve.length > 0 && (
                <div className="flex equity-curve-chart flex-grow relative h-[60vh] p-9 rounded-lg shadow-lg">
                    <Line
                        data={{
                            labels: dateLabels,
                            datasets: [
                                {
                                    label: 'Equity Curve',
                                    data: equityCurve,
                                    fill: 'start',
                                    backgroundColor: 'rgba(75,192,192,0.2)',
                                    borderColor: 'rgba(75,192,192,0.7)',
                                },
                            ],
                        }}
                        options={{
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    grid: {
                                        display: false,
                                    },
                                },
                                y: {
                                    grid: {
                                        display: false,
                                    },
                                },
                            },
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default Dashboard;
