# Eltako Web Interface

A modern React-based web interface for controlling Eltako smart blinds and shutters.

## Features

- **Real-time Actor Status**: View current position, tilt status, and device information
- **Individual Control**: Set position and tilt for each actor independently
- **Global Controls**: Control all actors at once with tilt operations
- **Modern UI**: Built with React, TypeScript, TailwindCSS, and shadcn/ui components
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Auto-refresh**: Status updates automatically every 30 seconds

## Development

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Go 1.23+

### Quick Start

1. **Development Mode** (recommended for development):
   ```bash
   # Start both frontend and backend in development mode
   ./dev.sh
   ```
   This will start:
   - Backend API server on http://localhost:8080
   - Frontend dev server on http://localhost:5173 (with hot reload)

2. **Production Build**:
   ```bash
   # Build both frontend and backend
   make build
   
   # Run the integrated application
   make run
   ```
   This serves the built React app from the Go server on http://localhost:8080

### Frontend Development

```bash
cd web

# Install dependencies
pnpm install

# Start development server (requires backend running)
pnpm run dev

# Build for production
pnpm run build
```

### Backend Development

```bash
# Build backend only
make build-backend

# Run backend only (serves built frontend if available)
make dev-backend
```

## API Endpoints

### Get All Actors
```
GET /api/actors
```
Returns array of actor status objects.

### Get Single Actor
```
GET /api/actors/{actorName}
```
Returns status for specific actor.

### Set Actor Position
```
POST /api/actors/{actorName}/position
Content-Type: application/json

{
  "position": 50
}
```

### Tilt Actor
```
POST /api/actors/{actorName}/tilt
Content-Type: application/json

{
  "position": 75
}
```

### Tilt All Actors
```
POST /api/actors/all/tilt
Content-Type: application/json

{
  "position": 50
}
```

## Docker

The Dockerfile builds both frontend and backend in a multi-stage build:

```bash
# Build Docker image
make docker

# Or build directly
docker build -t eltako-control-panel .
```

## Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI components
- **Lucide Icons** - Beautiful icon set
- **pnpm** - Fast package manager

### Backend
- **Go** - Backend API server
- **Chi Router** - HTTP router and middleware
- **CORS Support** - Cross-origin resource sharing

## Project Structure

```
web/
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   └── ActorCard.tsx  # Actor control card
│   ├── lib/               # Utilities
│   │   ├── api.ts         # API client functions
│   │   └── utils.ts       # Common utilities
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── dist/                # Built frontend (generated)
├── package.json         # Frontend dependencies
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # TailwindCSS configuration
└── tsconfig.json        # TypeScript configuration
```
