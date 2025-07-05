# Albion Market History

A simple, clean React app for tracking Albion Online market data. Hosted entirely on **GitHub Pages** - no third-party services required!

## 🏗️ Simple Project Structure

```
albion-market-history/
├── src/
│   ├── components/         # React components
│   ├── services/          # API service for Albion data
│   ├── App.js             # Main app
│   └── ...
├── public/                # Static assets
├── package.json           # Dependencies
└── README.md
```

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm start
```

### Deploy to GitHub Pages
```bash
# Update the homepage field in package.json with your GitHub username
# Then deploy:
npm run deploy
```

## 📊 Data Source

This app directly calls the **Albion Online Data Project API** from the browser:
- Real-time market prices
- Historical price data
- No backend server needed!

## 🌐 GitHub Pages Deployment

1. **Update package.json**: Change `yourusername` to your GitHub username
2. **Create GitHub repo**: Push your code to GitHub
3. **Enable GitHub Pages**: In repo settings, enable Pages from gh-pages branch
4. **Deploy**: Run `npm run deploy`

Your app will be live at: `https://yourusername.github.io/albion-market-history`

## ✨ Features

- 📊 **Real-time Market Data** - Direct API calls to Albion Online
- 📈 **Price History** - Historical market trends
- 🔍 **Item Search** - Filter by category, tier, or name
- 📱 **Responsive Design** - Works on all devices
- 🎨 **Modern UI** - Clean, professional interface
- 🚀 **Simple Hosting** - Pure GitHub Pages, no third parties

## 🔧 API Endpoints Used

The app calls these Albion Online Data Project endpoints:
- `https://www.albion-online-data.com/api/v2/stats/prices/{itemId}`
- `https://www.albion-online-data.com/api/v2/stats/history/{itemId}`

## 📦 Single Package Benefits

✅ **One `node_modules` folder**  
✅ **Simple React app structure**  
✅ **Pure GitHub hosting**  
✅ **No serverless complexity**  
✅ **Easy to understand and maintain**  

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `npm start`
5. Submit a pull request

## 📄 License

MIT License
