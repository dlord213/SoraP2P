import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface TransferState {
  fileName: string;
  fileSize: number;
  progress: number;
  speed: number; // bytes per second
  type: 'send' | 'receive';
}

export interface HistoryLog {
  id: string;
  fileName: string;
  fileSize: number;
  timestamp: number;
  status: 'Success' | 'Failed';
  peerId: string;
}

interface AppContextType {
  connectionStatus: ConnectionStatus;
  currentTransfer: TransferState | null;
  transferHistory: HistoryLog[];
  roomId: string | null;
  encryptionKey: string | null;
  errorMessage: string | null;
  hasWeakKey: boolean;
  clearHistory: () => void;
  startTransfer: (file: File) => Promise<void>;
  joinRoom: (codeAndKeyString: string) => Promise<void>;
  disconnectPeer: () => void;
  setErrorMessage: (msg: string | null) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accent: 'classic-gold' | 'cyber-cyan' | 'hacker-green' | 'arcade-pink' | 'crimson-red';
  setAccent: (accent: 'classic-gold' | 'cyber-cyan' | 'hacker-green' | 'arcade-pink' | 'crimson-red') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
};

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [currentTransfer, setCurrentTransfer] = useState<TransferState | null>(null);
  const [transferHistory, setTransferHistory] = useState<HistoryLog[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasWeakKey, setHasWeakKey] = useState<boolean>(false);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [accent, setAccentState] = useState<
    'classic-gold' | 'cyber-cyan' | 'hacker-green' | 'arcade-pink' | 'crimson-red'
  >('classic-gold');

  // Load theme and accent from localStorage on mount (SSR safe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('tobu_theme') as 'light' | 'dark';
      const storedAccent = localStorage.getItem('tobu_accent') as any;

      if (storedTheme) {
        setThemeState(storedTheme);
        document.documentElement.setAttribute('data-theme', storedTheme);
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }

      if (storedAccent) {
        setAccentState(storedAccent);
        document.documentElement.setAttribute('data-accent', storedAccent);
      } else {
        document.documentElement.setAttribute('data-accent', 'classic-gold');
      }
    }
  }, []);

  const setTheme = (t: 'light' | 'dark') => {
    setThemeState(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tobu_theme', t);
      document.documentElement.setAttribute('data-theme', t);
    }
  };

  const setAccent = (a: 'classic-gold' | 'cyber-cyan' | 'hacker-green' | 'arcade-pink' | 'crimson-red') => {
    setAccentState(a);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tobu_accent', a);
      document.documentElement.setAttribute('data-accent', a);
    }
  };

  // WebRTC & WS Refs
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const currentFileRef = useRef<File | null>(null);
  const aesKeyRef = useRef<CryptoKey | null>(null);
  
  // Receives chunks accumulator
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedBytesRef = useRef<number>(0);
  const transferStartTimeRef = useRef<number>(0);
  const fileMetadataRef = useRef<{ fileName: string; fileSize: number; fileType: string } | null>(null);

  // Max size: 1GB (1073741824 bytes)
  const MAX_FILE_SIZE = 1024 * 1024 * 1024;

  // Load history from localStorage on mount (SSR safe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tobu_history');
      if (stored) {
        try {
          setTransferHistory(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse history', e);
        }
      }
    }
  }, []);

  // Save history to localStorage
  const addToHistory = (fileName: string, fileSize: number, status: 'Success' | 'Failed', peerId: string) => {
    const newLog: HistoryLog = {
      id: Math.random().toString(36).substring(2, 9),
      fileName,
      fileSize,
      timestamp: Date.now(),
      status,
      peerId,
    };
    setTransferHistory((prev) => {
      const updated = [newLog, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('tobu_history', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setTransferHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tobu_history');
    }
  };

  // Helper to cleanup connection
  const disconnectPeer = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.close();
      channelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setConnectionStatus('idle');
    setCurrentTransfer(null);
    setRoomId(null);
    setEncryptionKey(null);
    setHasWeakKey(false);
    aesKeyRef.current = null;
    currentFileRef.current = null;
    receivedChunksRef.current = [];
    receivedBytesRef.current = 0;
    fileMetadataRef.current = null;
  };

  // Generate AES Cryptographic Key
  const generateStrongKey = async (): Promise<{ key: CryptoKey; hex: string }> => {
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await window.crypto.subtle.exportKey('raw', key);
    const hex = Array.from(new Uint8Array(exported))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return { key, hex };
  };

  // Derive AES Cryptographic Key from a weak room code (SHA-256)
  const deriveWeakKey = async (code: string): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return await window.crypto.subtle.importKey(
      'raw',
      hash,
      'AES-GCM',
      true,
      ['encrypt', 'decrypt']
    );
  };

  // Import Key from Hex
  const importKeyFromHex = async (hex: string): Promise<CryptoKey> => {
    const keyBuffer = new Uint8Array(
      hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
    return await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      true,
      ['encrypt', 'decrypt']
    );
  };

  // Initialize WebRTC Peer Connection
  const initPeerConnection = (room: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pcRef.current = pc;

    // Expose ICE Candidates to signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'signal',
            room,
            data: { candidate: event.candidate },
          })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('RTCPeerConnection State:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        setConnectionStatus('disconnected');
        // Log failure if a transfer was in progress
        if (currentFileRef.current) {
          addToHistory(currentFileRef.current.name, currentFileRef.current.size, 'Failed', room);
        } else if (fileMetadataRef.current) {
          addToHistory(fileMetadataRef.current.fileName, fileMetadataRef.current.fileSize, 'Failed', room);
        }
        disconnectPeer();
      } else if (pc.connectionState === 'failed') {
        setConnectionStatus('failed');
        setErrorMessage('P2P Connection failed to establish.');
        disconnectPeer();
      }
    };

    if (isInitiator) {
      // Creator makes the data channel
      console.log('Creating Data Channel...');
      const channel = pc.createDataChannel('file-transfer', { ordered: true });
      setupDataChannel(channel, room);
    } else {
      // Receiver listens for the data channel
      pc.ondatachannel = (event) => {
        console.log('Data Channel Received!');
        setupDataChannel(event.channel, room);
      };
    }

    return pc;
  };

  // Setup WebRTC Data Channel Event Listeners
  const setupDataChannel = (channel: RTCDataChannel, room: string) => {
    channelRef.current = channel;
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log('Data Channel Opened!');
      setConnectionStatus('connected');
      
      // If we are the sender, start sending
      if (currentFileRef.current) {
        sendBufferedFile(channel, room);
      }
    };

    channel.onclose = () => {
      console.log('Data Channel Closed');
      setConnectionStatus('disconnected');
    };

    channel.onerror = (err) => {
      console.error('Data Channel Error:', err);
      setErrorMessage('A data channel error occurred during transfer.');
      setConnectionStatus('failed');
      disconnectPeer();
    };

    channel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        // Text Message: JSON Metadata or EOF
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'metadata') {
            console.log('Received Metadata:', parsed);
            fileMetadataRef.current = parsed;
            receivedChunksRef.current = [];
            receivedBytesRef.current = 0;
            transferStartTimeRef.current = Date.now();

            setCurrentTransfer({
              fileName: parsed.fileName,
              fileSize: parsed.fileSize,
              progress: 0,
              speed: 0,
              type: 'receive',
            });
          } else if (parsed.type === 'eof') {
            console.log('Received EOF. Reassembling file...');
            if (fileMetadataRef.current) {
              const blob = new Blob(receivedChunksRef.current, {
                type: fileMetadataRef.current.fileType || 'application/octet-stream',
              });
              const url = URL.createObjectURL(blob);
              
              // Trigger automatic download
              const a = document.createElement('a');
              a.href = url;
              a.download = fileMetadataRef.current.fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              
              // Clean up blob url instantly to free memory
              setTimeout(() => {
                URL.revokeObjectURL(url);
              }, 100);

              addToHistory(
                fileMetadataRef.current.fileName,
                fileMetadataRef.current.fileSize,
                'Success',
                room
              );
              
              // Reset current transfer
              setCurrentTransfer(null);
            }
          }
        } catch (e) {
          console.error('Error parsing text packet', e);
        }
      } else {
        // Binary Message: Encrypted Chunk
        if (!aesKeyRef.current || !fileMetadataRef.current) {
          console.error('Key or metadata missing for decryption');
          return;
        }

        try {
          const packet = new Uint8Array(event.data);
          const iv = packet.slice(0, 12);
          const ciphertext = packet.slice(12);

          const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            aesKeyRef.current,
            ciphertext
          );

          receivedChunksRef.current.push(decrypted);
          receivedBytesRef.current += decrypted.byteLength;

          const elapsed = (Date.now() - transferStartTimeRef.current) / 1000;
          const speed = elapsed > 0 ? receivedBytesRef.current / elapsed : 0;
          const progress = Math.min(100, (receivedBytesRef.current / fileMetadataRef.current.fileSize) * 100);

          setCurrentTransfer({
            fileName: fileMetadataRef.current.fileName,
            fileSize: fileMetadataRef.current.fileSize,
            progress,
            speed,
            type: 'receive',
          });
        } catch (e) {
          console.error('Decryption failed', e);
          setErrorMessage('Decryption failed. Room key might be invalid.');
          addToHistory(
            fileMetadataRef.current?.fileName || 'Unknown File',
            fileMetadataRef.current?.fileSize || 0,
            'Failed',
            room
          );
          disconnectPeer();
        }
      }
    };
  };

  // Chunk and Encrypt File Transfer (Sender with backpressure)
  const sendBufferedFile = async (channel: RTCDataChannel, room: string) => {
    const file = currentFileRef.current;
    const aesKey = aesKeyRef.current;
    if (!file || !aesKey) return;

    console.log('Starting file send transfer...', file.name);

    // Send metadata
    channel.send(
      JSON.stringify({
        type: 'metadata',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      })
    );

    setCurrentTransfer({
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      speed: 0,
      type: 'send',
    });

    const fileReader = new FileReader();
    let offset = 0;
    const chunkSize = 32 * 1024; // 32KB chunks
    const startTime = Date.now();

    const readAndSendChunk = () => {
      if (offset >= file.size) {
        // Send EOF
        channel.send(JSON.stringify({ type: 'eof' }));
        console.log('File fully sent!');
        addToHistory(file.name, file.size, 'Success', room);
        setCurrentTransfer(null);
        currentFileRef.current = null;
        return;
      }

      const slice = file.slice(offset, offset + chunkSize);
      fileReader.onload = async (e) => {
        if (!e.target?.result) return;
        const arrayBuffer = e.target.result as ArrayBuffer;

        try {
          // Encrypt
          const iv = window.crypto.getRandomValues(new Uint8Array(12));
          const ciphertext = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            arrayBuffer
          );

          // Combine IV + ciphertext
          const packet = new Uint8Array(iv.length + ciphertext.byteLength);
          packet.set(iv, 0);
          packet.set(new Uint8Array(ciphertext), iv.length);

          // Send
          channel.send(packet);

          offset += arrayBuffer.byteLength;

          // Update progress & speed
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = elapsed > 0 ? offset / elapsed : 0;
          const progress = Math.min(100, (offset / file.size) * 100);

          setCurrentTransfer({
            fileName: file.name,
            fileSize: file.size,
            progress,
            speed,
            type: 'send',
          });

          // WebRTC Backpressure implementation
          // Pause reading if buffer amount > 64KB
          if (channel.bufferedAmount > 64 * 1024) {
            channel.onbufferedamountlow = () => {
              channel.onbufferedamountlow = null;
              readAndSendChunk();
            };
          } else {
            // Yield execution to main thread before reading next chunk
            setTimeout(readAndSendChunk, 0);
          }
        } catch (err) {
          console.error('Crypto error during send:', err);
          setErrorMessage('Failed to encrypt chunk during transmission.');
          addToHistory(file.name, file.size, 'Failed', room);
          disconnectPeer();
        }
      };

      fileReader.readAsArrayBuffer(slice);
    };

    // Begin loop
    readAndSendChunk();
  };

  // Connect to the Signaling Server
  const connectSignaling = (room: string, isInitiator: boolean) => {
    setConnectionStatus('connecting');

    // Detect server host
    const socketUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001`;
    console.log('Connecting to signaling:', socketUrl);

    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to signaling server');
      ws.send(JSON.stringify({ type: 'join', room }));
    };

    ws.onclose = () => {
      console.log('Signaling server socket closed');
    };

    ws.onerror = (err) => {
      console.error('Signaling socket error:', err);
      setErrorMessage('Could not connect to signaling server on port 3001.');
      setConnectionStatus('failed');
      disconnectPeer();
    };

    ws.onmessage = async (event) => {
      try {
        const parsed = JSON.parse(event.data);
        console.log('Signaling Message:', parsed.type);

        if (parsed.type === 'error') {
          setErrorMessage(parsed.message);
          setConnectionStatus('failed');
          disconnectPeer();
        } else if (parsed.type === 'peer-joined') {
          // A receiver joined our room!
          // We are the initiator (sender), so initialize RTC connection and make offer
          console.log('Peer joined! Initiating WebRTC...');
          const pc = initPeerConnection(room, true);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(
            JSON.stringify({
              type: 'signal',
              room,
              data: { sdp: offer },
            })
          );
        } else if (parsed.type === 'signal') {
          const { sdp, candidate } = parsed.data;

          if (sdp) {
            // Handle SDP offer or answer
            if (sdp.type === 'offer') {
              console.log('Received SDP Offer. Creating Answer...');
              // Receiver initializes connection as non-initiator
              const pc = initPeerConnection(room, false);
              await pc.setRemoteDescription(new RTCSessionDescription(sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(
                JSON.stringify({
                  type: 'signal',
                  room,
                  data: { sdp: answer },
                })
              );
            } else if (sdp.type === 'answer') {
              console.log('Received SDP Answer. Setting Remote Description...');
              if (pcRef.current) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
              }
            }
          } else if (candidate) {
            // Handle ICE Candidate
            console.log('Received ICE Candidate. Adding...');
            if (pcRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        } else if (parsed.type === 'peer-left') {
          console.log('Peer disconnected.');
          setErrorMessage('Peer has left the room.');
          setConnectionStatus('disconnected');
          disconnectPeer();
        }
      } catch (e) {
        console.error('Error handling signaling message', e);
      }
    };
  };

  // API exposed to Start a File Transfer (Generate Room + Key, connect WS)
  const startTransfer = async (file: File) => {
    // 1. Validation size limit
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`File size is ${Math.round(file.size / (1024 * 1024))}MB. Maximum allowed is 1GB (1024MB).`);
      return;
    }

    disconnectPeer();
    currentFileRef.current = file;

    // 2. Generate room ID (6 digits)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomId(code);

    // 3. Generate Cryptographic Key
    try {
      const { key, hex } = await generateStrongKey();
      aesKeyRef.current = key;
      setEncryptionKey(hex);
      setHasWeakKey(false);

      // Set URL hash so it never goes to server
      if (typeof window !== 'undefined') {
        window.location.hash = `${code}!${hex}`;
      }

      // 4. Connect to signaling
      connectSignaling(code, true);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to generate secure encryption keys.');
    }
  };

  // API exposed to Join a Room (Retrieve Room + Key from entered code/hash, connect WS)
  const joinRoom = async (codeAndKeyString: string) => {
    disconnectPeer();

    // Parse entered code (could be full link, room code!key, or raw 6-digit code)
    let code = '';
    let keyHex = '';

    // If it is a full URL, extract hash
    let cleanString = codeAndKeyString.trim();
    if (cleanString.includes('#')) {
      cleanString = cleanString.split('#')[1];
    } else if (cleanString.includes('://')) {
      // Just extract code if it contains routes
      try {
        const url = new URL(cleanString);
        cleanString = url.hash.substring(1);
      } catch (e) {
        // Not a URL
      }
    }

    if (cleanString.includes('!')) {
      const parts = cleanString.split('!');
      code = parts[0].trim();
      keyHex = parts[1].trim();
    } else {
      code = cleanString.trim();
    }

    // Validation room code (6 digits)
    if (!/^\d{6}$/.test(code)) {
      setErrorMessage('Room code must be a 6-digit number.');
      return;
    }

    setRoomId(code);

    try {
      if (keyHex) {
        // Strong Key from url/hash
        const key = await importKeyFromHex(keyHex);
        aesKeyRef.current = key;
        setEncryptionKey(keyHex);
        setHasWeakKey(false);
      } else {
        // Weak fallback derived key
        const key = await deriveWeakKey(code);
        aesKeyRef.current = key;
        setEncryptionKey(null);
        setHasWeakKey(true);
      }

      // Connect signaling as receiver (non-initiator)
      connectSignaling(code, false);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to initialize decryption keys.');
    }
  };

  return (
    <AppContext.Provider
      value={{
        connectionStatus,
        currentTransfer,
        transferHistory,
        roomId,
        encryptionKey,
        errorMessage,
        hasWeakKey,
        clearHistory,
        startTransfer,
        joinRoom,
        disconnectPeer,
        setErrorMessage,
        theme,
        setTheme,
        accent,
        setAccent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
