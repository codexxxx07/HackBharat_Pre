# 🧠 RecallOps — AI that never forgets

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hackathon](https://img.shields.io/badge/Hackathon-HackBharat%20Pre--Hackathon-blue)](https://hackbharat.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.0-38b2ac)](https://tailwindcss.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-f7df1e)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

> **AI-powered Incident Response Agent for DevOps teams**

RecallOps is an intelligent AI agent that remembers every past server incident and helps engineers fix problems faster. When a new incident occurs, the AI recalls similar past incidents from Hindsight memory and suggests the exact fix that worked before.

---

## 🚀 Features

### 📊 Dashboard
- View all incidents in a clean, organized table
- Real-time statistics (total incidents, resolved count, memory entries)
- Severity badges with color-coded indicators
- Status tracking (Open/Resolved)

### 🤖 AI Assistant
- Chat interface powered by Groq's Mixtral 8x7b LLM
- Retrieves top 3 similar past incidents from Hindsight memory
- Context-aware solutions based on your specific infrastructure
- Visual Memory Context panel showing what Hindsight recalled

### 📝 Incident Logger
- Log new incidents with structured fields
- Auto-save to Hindsight memory bank
- Capture title, severity, description, error logs, and resolution steps
- Form validation and toast notifications

### 💾 Memory Viewer
- Browse all stored memories in card layout
- Timeline view showing incident history
- Before vs After memory comparison
- Search and filter capabilities

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Structure & Semantics |
| **Tailwind CSS** | Styling & Responsive Design |
| **Vanilla JavaScript** | Application Logic |
| **Groq API** | LLM (Mixtral 8x7b-32768) |
| **Hindsight Cloud** | Memory Layer by Vectorize |

---

## 🧠 How Memory Works

```
┌─────────────────┐
│  New Incident   │
│  Occurs         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Engineer Logs  │
│  Incident       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Stored in      │
│  Hindsight      │
│  Memory Bank    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Future Query   │
│  to AI          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Hindsight      │
│  Retrieves Top  │
│  3 Similar      │
│  Incidents      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Groq AI Uses   │
│  Memory Context │
│  for Accurate   │
│  Solutions      │
└─────────────────┘
```

### Memory Flow

1. **Incident Logged** → Stored in Hindsight memory bank with metadata
2. **Query Made** → Hindsight performs semantic search
3. **Context Retrieved** → Top 3 similar incidents fetched
4. **AI Response** → Groq uses memory context for personalized solutions
5. **Visual Feedback** → Memory Context panel shows retrieved incidents

---

## 📊 Before vs After Memory

| Aspect | ❌ Without Memory | ✅ With Memory |
|--------|------------------|----------------|
| **Response Quality** | Generic suggestions based on training data | Context-aware, proven solutions from your environment |
| **Resolution Time** | Longer trial-and-error process | Faster with exact fixes that worked before |
| **Personalization** | One-size-fits-all answers | Tailored to your infrastructure and past incidents |
| **Learning** | No knowledge retention | Continuous improvement from every incident |
| **Accuracy** | May miss environment-specific issues | Higher accuracy with historical context |

---

## 🏗 Project Structure

```
RecallOps/
├── index.html          # Main application UI
├── app.js              # Application logic & API integration
├── config.js           # API keys (not in repo - create manually)
├── package.json        # Dependencies & scripts
├── tailwind.config.js  # Tailwind configuration
├── src/
│   └── input.css       # Tailwind input styles
├── dist/
│   └── output.css      # Compiled CSS
└── README.md           # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Groq API Key
- Hindsight API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/recallops.git
   cd recallops
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build CSS**
   ```bash
   npm run build
   ```
   Or for development with watch mode:
   ```bash
   npm run watch
   ```

4. **Create config.js**
   
   Create a `config.js` file in the root directory with your API keys:
   ```javascript
   const GROQ_API_KEY = "your_groq_api_key_here";
   const HINDSIGHT_API_KEY = "your_hindsight_api_key_here";
   const HINDSIGHT_BANK_ID = "recallops-memory";
   const HINDSIGHT_API_URL = "https://api.hindsight.vectorize.io";
   ```

5. **Run the application**
   
   Open `index.html` with Live Server (VS Code extension) or any local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js http-server
   npx http-server
   ```
   
   Then navigate to `http://localhost:8000`

---

## 🎨 UI Features

- **Dark/Light Theme Toggle** - Switch between themes with persistence
- **Glassmorphism Design** - Modern frosted glass effects
- **Responsive Layout** - Works on desktop and mobile
- **Skeleton Loader** - Smooth loading experience
- **Smooth Animations** - Fade-in, slide-up, and pulse effects
- **Custom Scrollbar** - Styled scrollbars matching the theme
- **Toast Notifications** - User feedback for actions

---

## 🔧 Configuration

### Hindsight Memory Bank

The application uses a memory bank named `recallops-memory` by default. You can customize this in `config.js`:

```javascript
const HINDSIGHT_BANK_ID = "your-custom-bank-id";
```

### Groq Model

The application uses `mixtral-8x7b-32768` model for optimal performance and context length.

---

## 📝 API Integration

### Hindsight API

- **Store Memory**: POST `/v1/default/banks/{bank_id}/retain`
- **Retrieve Memory**: POST `/v1/default/banks/{bank_id}/recall`

### Groq API

- **Chat Completion**: POST `/openai/v1/chat/completions`

---

## 🎯 Hackathon Criteria

### ✨ Innovation
AI-powered DevOps memory agent that learns from every incident

### 🧠 Hindsight Memory (25% weight)
- Central to the solution architecture
- Every incident stored and retrieved for context
- Visual memory context panel in AI chat

### 💻 Technical Implementation
- Clean vanilla JavaScript without frameworks
- Modular code structure with separation of concerns
- Efficient API integration with error handling

### 🎨 User Experience
- Dark theme with glassmorphism design
- Responsive layout for all screen sizes
- Smooth animations and transitions
- Intuitive navigation and form design

### 🌍 Real-world Impact
- Reduces incident resolution time significantly
- Prevents repeated mistakes
- Builds institutional knowledge
- Scales with team growth

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Groq** - For the fast LLM API
- **Hindsight by Vectorize** - For the memory layer technology
- **Tailwind CSS** - For the utility-first CSS framework
- **HackBharat** - For the opportunity to build this

---

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

**Built with ❤️ for HackBharat Pre-Hackathon by team Codex**
