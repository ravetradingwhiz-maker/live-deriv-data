import { NextResponse } from "next/server"

export async function GET() {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Live Deriv Data Analysis - User Guide</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #1e40af;
            text-align: center;
            margin-bottom: 10px;
            font-size: 32px;
        }
        
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        
        h2 {
            color: #1e40af;
            margin-top: 30px;
            margin-bottom: 15px;
            font-size: 22px;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 10px;
        }
        
        h3 {
            color: #2563eb;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .feature-box {
            background-color: #f0f4ff;
            border-left: 4px solid #1e40af;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        .feature-box h4 {
            color: #1e40af;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .feature-box p {
            margin: 0;
            font-size: 13px;
        }
        
        ul, ol {
            margin-left: 25px;
            margin-bottom: 15px;
        }
        
        li {
            margin-bottom: 10px;
        }
        
        .step-box {
            background-color: #fafafa;
            border: 1px solid #ddd;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        .step-box h4 {
            color: #1e40af;
            margin-bottom: 10px;
        }
        
        .permission-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 13px;
        }
        
        .permission-table th {
            background-color: #1e40af;
            color: white;
            padding: 12px;
            text-align: left;
        }
        
        .permission-table td {
            border: 1px solid #ddd;
            padding: 10px;
        }
        
        .permission-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .subscription-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 13px;
        }
        
        .subscription-table th {
            background-color: #2563eb;
            color: white;
            padding: 12px;
            text-align: left;
        }
        
        .subscription-table td {
            border: 1px solid #ddd;
            padding: 10px;
        }
        
        .subscription-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .checkmark {
            color: #16a34a;
            font-weight: bold;
        }
        
        .crossmark {
            color: #dc2626;
            font-weight: bold;
        }
        
        .warning-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        .info-box {
            background-color: #e0e7ff;
            border-left: 4px solid #4f46e5;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        
        .tab-content {
            background-color: #f5f7fa;
            border-left: 4px solid #1e40af;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        .tab-content h4 {
            color: #1e40af;
            margin-bottom: 10px;
        }
        
        page-break {
            display: block;
            margin-top: 50px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Live Deriv Data Analysis</h1>
        <p class="subtitle">Professional Trading Platform - User Guide</p>
        
        <div class="section">
            <h2>Welcome to Live Deriv Data Analysis</h2>
            <p>
                Live Deriv Data Analysis is a professional trading platform designed for analyzing real-time market data, 
                executing predictions, and backtesting trading strategies. This guide will help you navigate the platform 
                and maximize its features based on your subscription level.
            </p>
        </div>
        
        <div class="section">
            <h2>Getting Started</h2>
            
            <h3>1. Login to Your Account</h3>
            <div class="step-box">
                <h4>Demo Credentials Available:</h4>
                <ul>
                    <li><strong>Admin Account:</strong> Email: admin@example.com | Password: admin123</li>
                    <li><strong>Trader Account:</strong> Email: trader@example.com | Password: trader123</li>
                    <li><strong>Viewer Account:</strong> Email: viewer@example.com | Password: viewer123</li>
                </ul>
            </div>
            
            <h3>2. Dashboard Navigation</h3>
            <p>Upon login, you'll see the trading dashboard with three main tabs:</p>
            <div class="feature-box">
                <h4>Trading Tab</h4>
                <p>View technical indicators and candlestick charts with real-time data analysis.</p>
            </div>
            <div class="feature-box">
                <h4>Analysis Tab</h4>
                <p>Select markets, start analysis, and make predictions using AI-powered strategies.</p>
            </div>
            <div class="feature-box">
                <h4>Backtesting Tab</h4>
                <p>Test trading strategies against historical data (Premium & Enterprise only).</p>
            </div>
        </div>
        
        <div class="section">
            <h2>User Roles & Permissions</h2>
            <p>Your account role determines what features you can access:</p>
            
            <table class="permission-table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Admin</th>
                        <th>Trader</th>
                        <th>Viewer</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>View Real-Time Data</td>
                        <td class="checkmark">✓</td>
                        <td class="checkmark">✓</td>
                        <td class="checkmark">✓</td>
                    </tr>
                    <tr>
                        <td>Execute Trades</td>
                        <td class="checkmark">✓</td>
                        <td class="checkmark">✓</td>
                        <td class="crossmark">✗</td>
                    </tr>
                    <tr>
                        <td>Run Backtests</td>
                        <td class="checkmark">✓</td>
                        <td class="checkmark">✓</td>
                        <td class="crossmark">✗</td>
                    </tr>
                    <tr>
                        <td>Access Admin Panel</td>
                        <td class="checkmark">✓</td>
                        <td class="crossmark">✗</td>
                        <td class="crossmark">✗</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Subscription Plans</h2>
            <p>Your subscription level determines your data refresh rate and available features:</p>
            
            <table class="subscription-table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Free</th>
                        <th>Premium</th>
                        <th>Enterprise</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Real-Time Data</td>
                        <td class="crossmark">✗</td>
                        <td class="checkmark">✓</td>
                        <td class="checkmark">✓</td>
                    </tr>
                    <tr>
                        <td>Backtesting</td>
                        <td class="crossmark">✗</td>
                        <td class="checkmark">✓</td>
                        <td class="checkmark">✓</td>
                    </tr>
                    <tr>
                        <td>Technical Indicators</td>
                        <td class="checkmark">✓</td>
                        <td class="checkmark">✓</td>
                        <td class="checkmark">✓</td>
                    </tr>
                    <tr>
                        <td>Prediction Strategies</td>
                        <td class="checkmark">✓</td>
                        <td class="checkmark">✓</td>
                        <td class="checkmark">✓</td>
                    </tr>
                    <tr>
                        <td>Priority Support</td>
                        <td class="crossmark">✗</td>
                        <td class="crossmark">✗</td>
                        <td class="checkmark">✓</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Using the Trading Dashboard</h2>
            
            <h3>Trading Tab</h3>
            <div class="tab-content">
                <h4>Technical Indicators Panel</h4>
                <p>
                    View key technical analysis indicators including Moving Averages (MA), Bollinger Bands (BB), 
                    Relative Strength Index (RSI), and MACD. These indicators help identify trends and potential entry/exit points.
                </p>
            </div>
            
            <div class="tab-content">
                <h4>Price Analysis Panel</h4>
                <p>
                    Monitor current price levels, support/resistance levels, and price change percentages. 
                    This panel updates in real-time with the latest market data.
                </p>
            </div>
            
            <div class="tab-content">
                <h4>Candlestick Chart</h4>
                <p>
                    Visual representation of price movements over time. Green candles indicate upward movement, 
                    red candles indicate downward movement. The chart updates based on the selected timeframe.
                </p>
            </div>
            
            <h3>Analysis Tab</h3>
            <div class="step-box">
                <h4>Step 1: Select a Market</h4>
                <p>Click the "Select market" dropdown and choose from available Volatility indices (e.g., 1HZ100V, 1HZ50V, 1HZ10V).</p>
            </div>
            
            <div class="step-box">
                <h4>Step 2: Start Analysis</h4>
                <p>Click the "Start Analysis" button to begin collecting real-time data. The buffer will populate with market ticks.</p>
            </div>
            
            <div class="step-box">
                <h4>Step 3: View Live Data</h4>
                <p>
                    The "Last digit" card shows the most recent price digit along with trend indicators. 
                    Watch the buffer count increase as more ticks are collected.
                </p>
            </div>
            
            <div class="step-box">
                <h4>Step 4: Make Predictions</h4>
                <p>
                    Use prediction buttons to submit your market predictions. Available strategies include:
                </p>
                <ul>
                    <li><strong>Over/Under:</strong> Predict if the next price will be over or under a threshold</li>
                    <li><strong>Even/Odd:</strong> Predict if the last digit will be even or odd</li>
                    <li><strong>Trend:</strong> Predict the direction of price movement</li>
                    <li><strong>High/Low:</strong> Predict if price will reach highs or lows</li>
                </ul>
            </div>
            
            <h3>Backtesting Tab</h3>
            <div class="info-box">
                <h4>Testing Strategies Against Historical Data</h4>
                <p>
                    The Backtesting panel allows you to test your trading strategies on historical data. 
                    Input your strategy parameters and run simulations to evaluate performance before live trading.
                </p>
            </div>
            <p><strong>Note:</strong> Backtesting is only available with Premium or Enterprise subscriptions.</p>
        </div>
        
        <div class="section">
            <h2>Key Features Explained</h2>
            
            <div class="feature-box">
                <h4>Real-Time Deriv WebSocket Connection</h4>
                <p>The platform maintains a live connection to Deriv API for real-time market data. Connection status is indicated by the WiFi icon in the dashboard.</p>
            </div>
            
            <div class="feature-box">
                <h4>Multiple AI Prediction Strategies</h4>
                <p>Choose from various prediction algorithms optimized for different market conditions and trading styles.</p>
            </div>
            
            <div class="feature-box">
                <h4>Technical Analysis Tools</h4>
                <p>Built-in indicators help you identify patterns and make informed trading decisions.</p>
            </div>
            
            <div class="feature-box">
                <h4>Advanced Backtesting Engine</h4>
                <p>Test strategies with comprehensive performance metrics and optimization tools.</p>
            </div>
            
            <div class="feature-box">
                <h4>User Permission System</h4>
                <p>Role-based access control ensures security and appropriate feature access for different user types.</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Connection Status & Troubleshooting</h2>
            
            <div class="warning-box">
                <h4>Connection Issues</h4>
                <p>
                    If you see a "Offline" status or WiFi icon is red, your connection to Deriv has been lost. 
                    Click the "Retry" button to attempt reconnection. The system will try up to 5 times automatically.
                </p>
            </div>
            
            <h3>Common Issues</h3>
            <ul>
                <li><strong>No Real-Time Data:</strong> Upgrade to Premium or Enterprise subscription for real-time data access.</li>
                <li><strong>Cannot Run Predictions:</strong> Ensure you have Trader role and sufficient buffer (at least 20 ticks).</li>
                <li><strong>Backtesting Locked:</strong> This feature requires Premium or Enterprise subscription.</li>
                <li><strong>Connection Timeout:</strong> Check your internet connection and try reconnecting.</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>Best Practices</h2>
            <ul>
                <li>Always check the WiFi connection status before initiating trades.</li>
                <li>Accumulate sufficient tick data (at least 50 ticks) before running predictions for better accuracy.</li>
                <li>Review backtesting results thoroughly before applying strategies to live trading.</li>
                <li>Monitor the tick buffer size; refresh if it exceeds 1000 ticks.</li>
                <li>Use technical indicators in conjunction with predictions for better decision-making.</li>
                <li>Keep your subscription plan updated for access to all features.</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>Dashboard Header Features</h2>
            
            <div class="feature-box">
                <h4>Theme Toggle</h4>
                <p>Switch between light and dark modes using the theme toggle button in the top-right corner.</p>
            </div>
            
            <div class="feature-box">
                <h4>Notifications</h4>
                <p>The bell icon shows important alerts and updates. The badge number indicates unread notifications.</p>
            </div>
            
            <div class="feature-box">
                <h4>Help</h4>
                <p>Click the help icon for quick access to documentation and support resources.</p>
            </div>
            
            <div class="feature-box">
                <h4>User Profile Menu</h4>
                <p>Access your profile, settings, security options, and logout functionality from the user avatar menu.</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Support & Feedback</h2>
            <p>
                For technical support, feature requests, or bug reports, contact us via WhatsApp at +254775317514. 
                Our team is ready to assist you with any questions or concerns.
            </p>
            <div class="info-box">
                <h4>Contact Us</h4>
                <p>WhatsApp: +254775317514</p>
                <p>Message: "Hello mentor, am ready to purchase your trading software package"</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Live Deriv Data Analysis - Professional Trading Platform</p>
            <p>Document generated for educational and trading purposes</p>
            <p>&copy; 2025 All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `

  // Convert HTML to PDF using html2pdf library approach
  // For production, consider using a library like 'jsPDF' or 'pdfkit'
  const pdfBuffer = Buffer.from(htmlContent)

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Live_Deriv_Data_Analysis_User_Guide.html"',
    },
  })
}
