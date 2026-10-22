# Netor VPN 🛡️

[Українська](#українська) | [English](#english)

---

<a name="українська"></a>
## 🇺🇦 Українська

**Netor VPN** — це сучасний, легкий та надійний десктопний VPN-клієнт, побудований на базі **Electron** та протоколу **Shadowsocks**. Додаток розроблено з акцентом на кастомний нативний інтерфейс, стабільне підключення до швидкісного сервера у Франкфурті та детальний облік часу сесій.

### 🚀 Основні можливості

* **Сервер у Франкфурті**: Оптимізоване та стабільне підключення через європейську локацію (Франкфурт, Німеччина).
* **Журнал сесій та точний час**: 
  * Фіксація точної дати та часу початку й завершення кожної сесії (наприклад, `22.10.2026 19:30` — `22.10.2026 23:00`).
  * Автоматичний розрахунок тривалості поточної сесії.
  * Загальний накопичувальний таймер усього часу користування VPN.
* **Автоматичне очищення реєстру (Auto Registry Cleanup)**: Гарантує, що після відключення VPN або закриття програми системні проксі-налаштування Windows повертаються до початкового стану, запобігаючи втраті інтернет-з'єднання.
* **Кастомний нативний інтерфейс**: Зручне керування підключенням в один клік без складних конфігурацій.
* **Моніторинг трафіку**: Відстеження швидкості та стану підключення в реальному часі.
* **Автоматичне управління процесами**: Інтегроване фонове керування ядром Shadowsocks.

### 🛠️ Технологічний стек

* **Frontend / GUI**: HTML5, CSS3, JavaScript (Electron Renderer)
* **Backend / App Control**: Node.js, Electron (Main & Preload Scripts)
* **VPN Core**: Shadowsocks Executable (`Shadowsocks.exe`)

---

### 📦 Встановлення та запуск розробки

1. **Клонувати репозиторій**:
   git clone https://github.com/netorsmokeweed3-arch/NetorVPN.git
   cd NetorVPN

2. **Встановити залежності**:
   npm install

3. **Запустити у режимі розробки**:
   npm start

4. **Зібрати готову версію (.exe)**:
   npm run build

---

<a name="english"></a>
## 🇬🇧 English

**Netor VPN** is a modern, lightweight, and reliable desktop VPN client built with **Electron** and powered by the **Shadowsocks** protocol. It features a custom native user interface, stable routing through a high-speed Frankfurt server, and precise session time tracking.

### 🚀 Features

* **Frankfurt Server**: High-speed, stable traffic routing through a primary location in Frankfurt, Germany.
* **Session Logs & Time Tracking**:
  * Records exact connection start and end timestamps (e.g., `22.10.2026 19:30` — `22.10.2026 23:00`).
  * Calculates individual session duration automatically.
  * Tracks total cumulative usage time across all sessions.
* **Automatic Registry Cleanup**: Automatically resets Windows proxy system settings upon disconnection or shutdown to prevent internet connectivity loss.
* **Custom Native UI**: Simple and responsive one-click connection interface.
* **Traffic Monitoring**: Real-time connection status and network activity tracking.
* **Process Management**: Graceful background management of the underlying Shadowsocks binary.

### 🛠️ Tech Stack

* **Frontend / GUI**: HTML5, CSS3, JavaScript (Electron Renderer)
* **Backend / Control**: Node.js, Electron (Main & Preload Scripts)
* **VPN Engine**: Shadowsocks Executable (`Shadowsocks.exe`)

---

### 📦 Installation & Setup

1. **Clone the repository**:
   git clone https://github.com/netorsmokeweed3-arch/NetorVPN.git
   cd NetorVPN

2. **Install dependencies**:
   npm install

3. **Run in development mode**:
   npm start

4. **Build Windows executable (.exe)**:
   npm run build

---
*Created by netorsmokeweed3-arch*
