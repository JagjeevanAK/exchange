#!/usr/bin/env node

/**
 * Development startup script with proper service ordering
 * Order: Poller -> Backend -> Notification Worker -> WS Gateway -> Frontend
 */

const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'Poller', dir: 'apps/poller', port: null, delay: 2000 },
  { name: 'Backend', dir: 'apps/backend', port: 3001, delay: 3000 },
  { name: 'Notification Worker', dir: 'apps/notification-worker', port: null, delay: 2000 },
  { name: 'WS Gateway', dir: 'apps/ws-gateway', port: 8080, delay: 2000 },
  { name: 'Frontend', dir: 'apps/frontend', port: 3000, delay: 3000 },
];

const processes = [];
let currentIndex = 0;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const serviceColors = [colors.cyan, colors.green, colors.yellow, colors.magenta, colors.blue];

function log(service, message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] [${service}]${colors.reset} ${message}`);
}

function startService(index) {
  if (index >= services.length) {
    console.log(`\n${colors.green}${colors.bright}✓ All services started!${colors.reset}\n`);
    console.log('Press Ctrl+C to stop all services\n');
    return;
  }

  const service = services[index];
  const serviceColor = serviceColors[index % serviceColors.length];

  log(service.name, `Starting...`, serviceColor);

  const proc = spawn('bun', ['run', 'dev'], {
    cwd: path.join(process.cwd(), service.dir),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  proc.stdout.on('data', (data) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((line) => line.trim());
    lines.forEach((line) => {
      log(service.name, line, serviceColor);
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((line) => line.trim());
    lines.forEach((line) => {
      log(service.name, line, colors.red);
    });
  });

  proc.on('close', (code) => {
    log(service.name, `Exited with code ${code}`, colors.red);
  });

  processes.push({ name: service.name, proc });

  // Wait before starting next service
  setTimeout(() => {
    log(service.name, `Started, waiting ${service.delay}ms before next service...`, serviceColor);
    startService(index + 1);
  }, service.delay);
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}Stopping all services...${colors.reset}\n`);

  processes.reverse().forEach(({ name, proc }) => {
    log(name, 'Stopping...', colors.yellow);
    proc.kill('SIGTERM');
  });

  setTimeout(() => {
    processes.forEach(({ proc }) => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    });
    console.log(`\n${colors.green}All services stopped${colors.reset}\n`);
    process.exit(0);
  }, 2000);
});

process.on('SIGTERM', () => {
  process.emit('SIGINT');
});

// Start the first service
console.log(`\n${colors.bright}Starting Exchange Platform Services${colors.reset}\n`);
startService(0);
