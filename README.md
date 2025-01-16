# AI-Powered Nutrition App

A modern, intelligent nutrition and meal planning application that helps users maintain a healthy lifestyle through personalized recommendations and tracking.

## 🌟 Features

- **Smart Dashboard**
  - Real-time nutrition tracking
  - Progress visualization
  - Daily statistics and insights
  - Recent meals overview

- **AI-Powered Meal Planner**
  - Personalized meal recommendations
  - Dietary restrictions and preferences handling
  - Weekly meal planning
  - Detailed recipes and instructions

- **Nutrition Tracker**
  - Comprehensive macro tracking
  - Visual progress indicators
  - Food logging system
  - Nutritional insights and analytics

## 🚀 Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- Chart.js
- Framer Motion
- HeadlessUI

### Backend
- Node.js
- Express
- Redis
- ChromaDB
- MongoDB

### AI/ML
- OpenAI Integration
- Custom recommendation engine
- Natural Language Processing

## 🛠 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nutrition-app.git
cd nutrition-app
```

2. Install backend dependencies:
```bash
cd nutrition_app/backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:
Create `.env` files in both frontend and backend directories with the necessary environment variables (see `.env.example` for reference).

5. Start the development servers:

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

## 🔧 Configuration

### Environment Variables

Backend `.env`:
```
PORT=5000
MONGODB_URI=your_mongodb_uri
REDIS_URL=your_redis_url
OPENAI_API_KEY=your_openai_api_key
```

Frontend `.env`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- The React and Node.js communities
- All contributors and supporters

## 📊 Project Status

Currently in active development. Check the [Issues](https://github.com/yourusername/nutrition-app/issues) page for planned features and known bugs.
