import { spawn } from 'child_process';

console.log("\x1b[36m[TOBU-RUN]\x1b[0m Starting Tobu P2P Development Environment...");

// 1. Spawn the Signaling Server
const signalingProcess = spawn('npx', ['tsx', 'signaling.ts'], {
  stdio: 'inherit',
  shell: true
});

// 2. Spawn the React Router Dev Server
const devProcess = spawn('npx', ['react-router', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Handle termination signals and clean up child processes
const handleExit = () => {
  console.log("\x1b[36m[TOBU-RUN]\x1b[0m Stopping dev servers and cleaning ports...");
  
  try {
    signalingProcess.kill('SIGINT');
  } catch (e) {}

  try {
    devProcess.kill('SIGINT');
  } catch (e) {}
  
  process.exit(0);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
process.on('exit', () => {
  try {
    signalingProcess.kill();
  } catch (e) {}
  try {
    devProcess.kill();
  } catch (e) {}
});

// Watch for premature child failures
signalingProcess.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`\x1b[36m[TOBU-RUN]\x1b[0m Signaling server failed with exit code ${code}`);
    handleExit();
  } else {
    console.log(`\x1b[36m[TOBU-RUN]\x1b[0m Signaling server inactive or running on another process (code ${code}). Dev server will remain active.`);
  }
});

devProcess.on('close', (code) => {
  console.log(`\x1b[36m[TOBU-RUN]\x1b[0m React Router dev server closed with exit code ${code}`);
  handleExit();
});
