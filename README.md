# ⚛️ QSphere - Quantum Future Website

A cutting-edge quantum-themed website showcasing futuristic design patterns, smooth animations, and immersive user experience. Built with modern web technologies for maximum performance and visual impact.

![QSphere Preview](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer%20Motion-11-0055FF?style=for-the-badge&logo=framer&logoColor=white)

## 🌟 Features

- ✨ **Smooth Scroll Animations** - Scroll-driven reveals with Framer Motion
- 🎨 **Modern Design** - Glassmorphism, gradient effects, and quantum-inspired visuals
- 📱 **Fully Responsive** - Mobile-first design approach with Tailwind CSS
- 🎬 **Video Integration** - Optimized video backgrounds and media playback
- 🔄 **Carousel Component** - 3D perspective carousel with external link handlers
- ⚡ **Fast Performance** - Vite bundler for instant HMR and optimized builds
- 🎭 **Interactive Elements** - Hover effects, animated borders, and light pulses
- 🚀 **Production Ready** - GitHub Pages deployment with CI/CD pipeline

## 🚀 Live Demo

🌐 **[Visit QSphere Live](https://kumailx051.github.io/Qsphere/)**

## 💻 Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Animation Library**: Framer Motion 11
- **Package Manager**: npm
- **Deployment**: GitHub Pages with GitHub Actions
- **Linting**: ESLint
- **CSS Processing**: PostCSS

## 📦 Installation

### Prerequisites
- Node.js 18.x or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/kumailx051/Qsphere.git
cd Qsphere

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎯 Usage

### Development
```bash
npm run dev
```
Runs the app in development mode with hot module replacement (HMR).
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
npm run build
```
Creates an optimized production build in the `dist/` folder.

### Linting
```bash
npm run lint
```
Runs ESLint to check code quality.

## 📁 Project Structure

```
src/
├── components/
│   ├── Navbar.jsx              # Navigation with logo
│   ├── CurvedCarousel.jsx       # 3D carousel with external links
│   ├── QuantumSections.jsx      # Scroll-driven quantum animations
│   ├── InfiniteGallery.jsx      # Image gallery component
│   ├── Footer.jsx               # Footer section
│   └── Crosshairs.jsx           # Crosshair effect component
├── pages/
│   ├── HomePage.jsx             # Landing page with hero, carousel, sections
│   ├── AboutPage.jsx            # About page with company info
│   └── ContactPage.jsx          # Contact form with info cards
├── assets/
│   ├── images/                  # PNG, WebP images
│   ├── videos/                  # MP4, WebM video files
│   └── logo.png                 # Brand logo
├── App.jsx                      # Main app component
├── main.jsx                     # Entry point
└── index.css                    # Global styles
```

## 🎨 Key Components

### CurvedCarousel
Horizontally scrolling 3D carousel with clickable slides linked to external sites:
- Quantarium: https://www.quantarium.com/
- Qubion Tech: https://qubiontech.com/
- Quantum Ronics: https://quantumronics.com/

### QuantumSections
Advanced scroll-driven animations featuring:
- Video positioning transforms
- Staggered text reveals
- Blur and fade effects
- Quote trigger detection

### Contact Page
Beautiful contact form with:
- Responsive grid layout
- Animated border glow effect
- Contact information cards
- Form validation ready

## 🎬 Animation Features

- **Scroll Transforms**: Video positioning based on scroll progress
- **Stagger Effects**: Sequential text animations on page load
- **Glow Pulse**: Animated box-shadow on contact card
- **Fade Reveals**: Blur-to-clear transitions on scroll
- **Motion Values**: Real-time animation tracking with Framer Motion

## 🔧 Configuration

### Vite Config
- Base path configured for GitHub Pages: `/Qsphere/`
- React plugin with Oxc for fast compilation
- Optimized build output

### Tailwind Config
- Custom color extensions
- Responsive breakpoints
- Animation configurations

## 🌐 GitHub Pages Deployment

The project is automatically deployed to GitHub Pages via GitHub Actions workflow (`.github/workflows/deploy.yml`):

- **Trigger**: Push to `master` branch
- **Build Process**: Node.js 18 with npm
- **Deploy Target**: `gh-pages` branch
- **Live URL**: https://kumailx051.github.io/Qsphere/

### Manual Deployment
```bash
npm run build
# The dist folder is deployed automatically by GitHub Actions
```

## 📊 Performance

- **Bundle Size**: ~150KB (gzipped)
- **Lighthouse Score**: 90+ (mobile & desktop)
- **Time to Interactive**: <2 seconds

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Kumail**
- GitHub: [@kumailx051](https://github.com/kumailx051)
- Email: kumailx051@gmail.com

## 🙏 Acknowledgments

- React and Vite communities
- Framer Motion for amazing animation capabilities
- Tailwind CSS for utility-first styling
- Quantum physics inspiration for design concepts

## 📞 Support

For support, email kumailx051@gmail.com or open an issue on GitHub.

---

<div align="center">

**[⬆ back to top](#-qsphere---quantum-future-website)**

Made with ❤️ by Kumail

</div>
