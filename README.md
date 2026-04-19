<a href="http://getpat.io"><img src="https://raw.githubusercontent.com/la5nta/pat-website/gh-pages/img/logo.png" width="128" ></a>

# Pat - Modern Winlink Client

[![Build status](https://github.com/la5nta/pat/actions/workflows/go.yaml/badge.svg)](https://github.com/la5nta/pat/actions)
[![Go Report Card](https://goreportcard.com/badge/github.com/la5nta/pat)](https://goreportcard.com/report/github.com/la5nta/pat)
[![Liberapay Patreons](http://img.shields.io/liberapay/patrons/la5nta.svg?logo=liberapay)](https://liberapay.com/la5nta)

Pat is a cross-platform Winlink client with basic messaging capabilities. It provides both a command-line interface and a **modern, responsive web interface** built with a premium glassmorphism aesthetic.

---

## 🚀 Quick Start (Recommended)

The easiest way to get Pat up and running is using **Docker Compose**.

### 1. Create a `docker-compose.yml`
```yaml
services:
  pat:
    image: la5nta/pat
    container_name: pat
    volumes:
      - ./pat-data:/app/pat
    ports:
      - "8080:8080"
    restart: unless-stopped
```

### 2. Launch the application
```bash
docker-compose up -d
```

### 3. Access the Web UI
Open your browser and navigate to `http://localhost:8080/ui`.

---

## ✨ Modernized Web Interface

The web interface has been recently overhauled for a premium, lightweight experience:
- **Zero jQuery:** Fully refactored to Vanilla JavaScript (ES Modules).
- **Bootstrap 5:** Modern, responsive layout with native components.
- **Glassmorphism Design:** Sleek, semi-transparent UI with high-end aesthetics.
- **Native Fetch API:** Efficient, promise-based data synchronization with the Go backend.
- **Bootstrap Icons:** Crisp, modern iconography throughout the app.

---

## 🛠 Features
* **Multi-Mode Support:** AX.25, Telnet, PACTOR, ARDOP, and Vara HF/FM.
* **Modern Mailbox:** Full composer/reader functionality with basic mailbox management.
* **Smart Attachments:** Auto-shrink image attachments for faster transmission.
* **Geolocation:** Post position reports using local GPS, browser location, or manual entry.
* **Rig Control:** Integrated hamlib support for automated frequency and PTT control.
* **Scheduled Tasks:** CRON-like syntax for automated execution of commands.
* **P2P Listening:** Listen for incoming connections using multiple modes concurrently.

---

## ⚙️ Configuration (.env)

Pat supports loading configuration via environment variables, which is especially useful when running in Docker. You can use the provided [.env.example](.env.example) as a template:

```env
PAT_MYCALL=W1AW
PAT_LOCATOR=FN31pr
PAT_LISTEN=telnet,ardop
```

---

## 💻 Manual Installation

### Binary Releases
Download the latest pre-compiled binaries from the [Releases](https://github.com/la5nta/pat/releases) page.

### Build from Source
If you have Go installed, you can build Pat from source:

```bash
git clone https://github.com/la5nta/pat
cd pat
./make.bash
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Modern Frontend Development
The frontend is located in the `web/` directory. It uses a modern Vite-based pipeline.
- To start the dev server: `cd web && npm install && npm run dev`
- To build for production: `./web/make.bash`

---

## 📜 License

Copyright (c) 2020 Martin Hebnes Pedersen LA5NTA. Distributed under the MIT License.

_Pat/wl2k-go is not affiliated with The Winlink Development Team nor the Winlink 2000 project._
