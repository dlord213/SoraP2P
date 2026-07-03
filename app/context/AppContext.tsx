import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { sfx } from '../utils/audio';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface TransferState {
  fileName: string;
  fileSize: number;
  progress: number;
  speed: number; // bytes per second
  type: 'send' | 'receive';
  zipContents?: string[];
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
  startTransfer: (file: File, zipContents?: string[]) => Promise<void>;
  joinRoom: (codeAndKeyString: string) => Promise<void>;
  disconnectPeer: () => void;
  setErrorMessage: (msg: string | null) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  accent: 'classic-gold' | 'cyber-cyan' | 'hacker-green' | 'arcade-pink' | 'crimson-red';
  setAccent: (accent: 'classic-gold' | 'cyber-cyan' | 'hacker-green' | 'arcade-pink' | 'crimson-red') => void;
  sendAvatarMove: (x: number, y: number) => void;
  sendAvatarChat: (text: string) => void;
  registerAvatarCallbacks: (onMove: (x: number, y: number) => void, onChat: (text: string) => void) => () => void;
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
  const ecdhKeyPairRef = useRef<CryptoKeyPair | null>(null);
  const fileHashRef = useRef<string | null>(null);
  const zipContentsRef = useRef<string[] | null>(null);

  // Avatar Callback Refs
  const peerAvatarMoveCallbackRef = useRef<((x: number, y: number) => void) | null>(null);
  const peerAvatarChatCallbackRef = useRef<((text: string) => void) | null>(null);
  
  // Receives chunks accumulator
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedBytesRef = useRef<number>(0);
  const transferStartTimeRef = useRef<number>(0);
  const fileMetadataRef = useRef<{ fileName: string; fileSize: number; fileType: string; fileHash?: string; zipContents?: string[] } | null>(null);

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
    ecdhKeyPairRef.current = null;
    fileHashRef.current = null;
    zipContentsRef.current = null;
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

  // Generate Ephemeral ECDH Key Pair
  const generateEcdhKeyPair = async (): Promise<CryptoKeyPair> => {
    return await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );
  };

  // Export ECDH Public Key to Hex
  const exportEcdhPublicKey = async (publicKey: CryptoKey): Promise<string> => {
    const exported = await window.crypto.subtle.exportKey('raw', publicKey);
    return Array.from(new Uint8Array(exported))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Import ECDH Public Key from Hex
  const importEcdhPublicKey = async (hex: string): Promise<CryptoKey> => {
    const bytes = new Uint8Array(
      hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    return await window.crypto.subtle.importKey(
      'raw',
      bytes,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
  };

  // Derive Shared AES-GCM Key from ECDH
  const deriveEcdhSharedKey = async (privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> => {
    return await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: publicKey },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  };

  // SHA-256 File Hash (Memory-Safe for files > 100MB by hashing first 10MB + last 10MB)
  const calculateFileHash = async (file: File): Promise<string> => {
    const size = file.size;
    let buffer: ArrayBuffer;
    if (size <= 100 * 1024 * 1024) {
      buffer = await file.arrayBuffer();
    } else {
      const chunk1 = file.slice(0, 10 * 1024 * 1024);
      const chunk2 = file.slice(size - 10 * 1024 * 1024, size);
      const b1 = await chunk1.arrayBuffer();
      const b2 = await chunk2.arrayBuffer();
      const combined = new Uint8Array(b1.byteLength + b2.byteLength);
      combined.set(new Uint8Array(b1), 0);
      combined.set(new Uint8Array(b2), b1.byteLength);
      buffer = combined.buffer;
    }
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Inspect ZIP file contents client-side
  const inspectZipFile = async (file: File): Promise<string[]> => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      return Object.keys(contents.files).filter((name) => !contents.files[name].dir);
    } catch (e) {
      console.warn('Failed to parse zip contents', e);
      return [];
    }
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
        sfx.playError();
        disconnectPeer();
      }
    };

    if (isInitiator) {
      console.log('Creating Data Channel...');
      const channel = pc.createDataChannel('file-transfer', { ordered: true });
      setupDataChannel(channel, room);
    } else {
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
      sfx.playConnect(); // Trigger 8-bit connection sound

      // If we are the sender, advertise file parameters to check for resumability
      if (currentFileRef.current) {
        channel.send(
          JSON.stringify({
            type: 'transfer-ready',
            fileName: currentFileRef.current.name,
            fileSize: currentFileRef.current.size,
            fileType: currentFileRef.current.type,
            fileHash: fileHashRef.current,
            zipContents: zipContentsRef.current || undefined,
          })
        );
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
      sfx.playError();
      disconnectPeer();
    };

    channel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        try {
          const parsed = JSON.parse(event.data);
          
          if (parsed.type === 'transfer-ready') {
            console.log('Received transfer-ready banner:', parsed);
            
            // Check if we have matching partial file chunks to trigger Resumable Transfer
            const canResume = 
              fileMetadataRef.current && 
              fileMetadataRef.current.fileName === parsed.fileName &&
              fileMetadataRef.current.fileSize === parsed.fileSize &&
              fileMetadataRef.current.fileHash === parsed.fileHash &&
              receivedBytesRef.current > 0;

            if (canResume) {
              console.log('Resuming partial transfer. Requesting offset:', receivedBytesRef.current);
              sfx.playConnect();
              channel.send(
                JSON.stringify({
                  type: 'resume-request',
                  offset: receivedBytesRef.current,
                })
              );
            } else {
              // Start brand new transfer
              receivedChunksRef.current = [];
              receivedBytesRef.current = 0;
              fileMetadataRef.current = parsed;
              transferStartTimeRef.current = Date.now();

              setCurrentTransfer({
                fileName: parsed.fileName,
                fileSize: parsed.fileSize,
                progress: 0,
                speed: 0,
                type: 'receive',
                zipContents: parsed.zipContents,
              });

              channel.send(
                JSON.stringify({
                  type: 'start-request',
                })
              );
            }
          } else if (parsed.type === 'resume-request') {
            console.log('Partner requested resume at offset:', parsed.offset);
            sendBufferedFile(channel, room, parsed.offset);
          } else if (parsed.type === 'start-request') {
            console.log('Partner requested standard start');
            sendBufferedFile(channel, room, 0);
          } else if (parsed.type === 'avatar-move') {
            if (peerAvatarMoveCallbackRef.current) {
              peerAvatarMoveCallbackRef.current(parsed.x, parsed.y);
            }
          } else if (parsed.type === 'avatar-chat') {
            if (peerAvatarChatCallbackRef.current) {
              peerAvatarChatCallbackRef.current(parsed.text);
            }
          } else if (parsed.type === 'eof') {
            console.log('Received EOF. Reassembling and verifying integrity...');
            if (fileMetadataRef.current) {
              const blob = new Blob(receivedChunksRef.current, {
                type: fileMetadataRef.current.fileType || 'application/octet-stream',
              });

              // Perform SHA-256 file verification check
              let verified = false;
              if (fileMetadataRef.current.fileHash) {
                const calculated = await calculateFileHash(new File([blob], fileMetadataRef.current.fileName));
                verified = (calculated === fileMetadataRef.current.fileHash);
                console.log(`Integrity Check: Calculated = ${calculated}, Expected = ${fileMetadataRef.current.fileHash}, Match = ${verified}`);
              } else {
                verified = true; // Fallback if hash was skipped
              }

              if (verified) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileMetadataRef.current.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                setTimeout(() => {
                  URL.revokeObjectURL(url);
                }, 100);

                addToHistory(
                  fileMetadataRef.current.fileName + " (Verified)",
                  fileMetadataRef.current.fileSize,
                  'Success',
                  room
                );
                sfx.playSuccess(); // Success chime!
              } else {
                console.error("Integrity hash check failed!");
                setErrorMessage("File hash verification failed. The file may be corrupted.");
                addToHistory(
                  fileMetadataRef.current.fileName + " (Corrupted)",
                  fileMetadataRef.current.fileSize,
                  'Failed',
                  room
                );
                sfx.playError();
              }

              // Reset buffers after compile
              receivedChunksRef.current = [];
              receivedBytesRef.current = 0;
              fileMetadataRef.current = null;
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
            zipContents: fileMetadataRef.current.zipContents,
          });
        } catch (e) {
          console.error('Decryption failed', e);
          setErrorMessage('Decryption failed. Room key might be invalid.');
          sfx.playError();
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

  // Chunk and Encrypt File Transfer (Sender with backpressure & offset controls)
  const sendBufferedFile = async (channel: RTCDataChannel, room: string, startOffset = 0) => {
    const file = currentFileRef.current;
    const aesKey = aesKeyRef.current;
    if (!file || !aesKey) return;

    console.log('Sending file from offset:', startOffset);

    setCurrentTransfer({
      fileName: file.name,
      fileSize: file.size,
      progress: (startOffset / file.size) * 100,
      speed: 0,
      type: 'send',
      zipContents: zipContentsRef.current || undefined,
    });

    const fileReader = new FileReader();
    let offset = startOffset;
    const chunkSize = 32 * 1024; // 32KB chunks
    const startTime = Date.now() - (offset > 0 ? (offset / (currentTransfer?.speed || 1024 * 1024)) * 1000 : 0);

    const readAndSendChunk = () => {
      if (offset >= file.size) {
        channel.send(JSON.stringify({ type: 'eof' }));
        console.log('File fully sent!');
        addToHistory(file.name, file.size, 'Success', room);
        sfx.playSuccess(); // Success chime!
        setCurrentTransfer(null);
        currentFileRef.current = null;
        fileHashRef.current = null;
        zipContentsRef.current = null;
        return;
      }

      if (channel.readyState !== 'open') {
        console.warn('Channel closed during transfer loop. Paused.');
        return;
      }

      const slice = file.slice(offset, offset + chunkSize);
      fileReader.onload = async (e) => {
        if (!e.target?.result) return;
        const arrayBuffer = e.target.result as ArrayBuffer;

        try {
          const iv = window.crypto.getRandomValues(new Uint8Array(12));
          const ciphertext = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            arrayBuffer
          );

          const packet = new Uint8Array(iv.length + ciphertext.byteLength);
          packet.set(iv, 0);
          packet.set(new Uint8Array(ciphertext), iv.length);

          channel.send(packet);

          offset += arrayBuffer.byteLength;

          const elapsed = (Date.now() - startTime) / 1000;
          const speed = elapsed > 0 ? offset / elapsed : 0;
          const progress = Math.min(100, (offset / file.size) * 100);

          setCurrentTransfer({
            fileName: file.name,
            fileSize: file.size,
            progress,
            speed,
            type: 'send',
            zipContents: zipContentsRef.current || undefined,
          });

          // WebRTC Backpressure: Pause reading if buffer amount > 64KB
          if (channel.bufferedAmount > 64 * 1024) {
            channel.onbufferedamountlow = () => {
              channel.onbufferedamountlow = null;
              readAndSendChunk();
            };
          } else {
            setTimeout(readAndSendChunk, 0);
          }
        } catch (err) {
          console.error('Crypto error during send:', err);
          setErrorMessage('Failed to encrypt chunk during transmission.');
          sfx.playError();
          addToHistory(file.name, file.size, 'Failed', room);
          disconnectPeer();
        }
      };

      fileReader.readAsArrayBuffer(slice);
    };

    readAndSendChunk();
  };

  // Connect to the Signaling Server
  const connectSignaling = (room: string, isInitiator: boolean) => {
    setConnectionStatus('connecting');

    const envUrl = import.meta.env.VITE_SIGNALING_URL;
    const socketUrl = envUrl || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001`;
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
      setErrorMessage('Could not connect to signaling server.');
      sfx.playError();
      setConnectionStatus('failed');
      disconnectPeer();
    };

    ws.onmessage = async (event) => {
      try {
        const parsed = JSON.parse(event.data);
        console.log('Signaling Message:', parsed.type);

        if (parsed.type === 'error') {
          setErrorMessage(parsed.message);
          sfx.playError();
          setConnectionStatus('failed');
          disconnectPeer();
        } else if (parsed.type === 'peer-joined') {
          // A receiver joined our room!
          if (!aesKeyRef.current) {
            // No pre-shared AES key! Initiate ECDH key exchange over WebSocket signals
            console.log('Initiating secure ECDH handshake...');
            const pair = await generateEcdhKeyPair();
            ecdhKeyPairRef.current = pair;
            const pubHex = await exportEcdhPublicKey(pair.publicKey);
            ws.send(
              JSON.stringify({
                type: 'signal',
                room,
                data: { ecdhPub: pubHex },
              })
            );
          } else {
            // Standard pre-shared AES-GCM link key
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
          }
        } else if (parsed.type === 'signal') {
          const { sdp, candidate, ecdhPub } = parsed.data;

          if (ecdhPub) {
            console.log('Received ECDH public key signal...');
            try {
              if (ecdhKeyPairRef.current) {
                // Partner sent public key. Derive shared AES key.
                const partnerPubKey = await importEcdhPublicKey(ecdhPub);
                const derivedAES = await deriveEcdhSharedKey(
                  ecdhKeyPairRef.current.privateKey,
                  partnerPubKey
                );
                aesKeyRef.current = derivedAES;
                setEncryptionKey('ecdh-shared-channel');
                setHasWeakKey(false);
                console.log('ECDH Shared AES Key derived successfully.');

                if (!isInitiator) {
                  // Receiver responds back with their own public key
                  const myPubHex = await exportEcdhPublicKey(ecdhKeyPairRef.current.publicKey);
                  ws.send(
                    JSON.stringify({
                      type: 'signal',
                      room,
                      data: { ecdhPub: myPubHex },
                    })
                  );
                } else {
                  // Creator now starts standard WebRTC channel setup with the derived key
                  console.log('ECDH derived. Creating WebRTC offer...');
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
                }
              }
            } catch (err) {
              console.error('Failed ECDH Handshake derivation:', err);
              setErrorMessage('Failed to establish secure key exchange.');
              sfx.playError();
              disconnectPeer();
            }
          } else if (sdp) {
            if (sdp.type === 'offer') {
              console.log('Received SDP Offer. Creating Answer...');
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
            console.log('Received ICE Candidate. Adding...');
            if (pcRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        } else if (parsed.type === 'peer-left') {
          console.log('Peer disconnected.');
          setErrorMessage('Peer has left the room.');
          setConnectionStatus('disconnected');
          sfx.playError();
          disconnectPeer();
        }
      } catch (e) {
        console.error('Error handling signaling message', e);
      }
    };
  };

  // API exposed to Start a File Transfer (Generate Room + Key, compute hash, inspect zip, connect WS)
  const startTransfer = async (file: File, zipContents?: string[]) => {
    sfx.playClick();

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`File size is ${Math.round(file.size / (1024 * 1024))}MB. Maximum allowed is 1GB (1024MB).`);
      sfx.playError();
      return;
    }

    disconnectPeer();
    currentFileRef.current = file;

    // Inspect zip contents if a zip file is selected directly
    let resolvedContents = zipContents || [];
    if (!zipContents && (file.name.endsWith('.zip') || file.type === 'application/zip')) {
      resolvedContents = await inspectZipFile(file);
    }
    zipContentsRef.current = resolvedContents.length > 0 ? resolvedContents : null;

    // Calculate SHA-256 hash
    try {
      const hash = await calculateFileHash(file);
      fileHashRef.current = hash;
      console.log('SHA-256 computed:', hash);
    } catch (e) {
      console.error('Could not compute file hash:', e);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomId(code);

    try {
      const { key, hex } = await generateStrongKey();
      aesKeyRef.current = key;
      setEncryptionKey(hex);
      setHasWeakKey(false);

      if (typeof window !== 'undefined') {
        window.location.hash = `${code}!${hex}`;
      }

      connectSignaling(code, true);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to generate secure encryption keys.');
      sfx.playError();
    }
  };

  // API exposed to Join a Room (Retrieve Room + Key from entered code/hash, connect WS)
  const joinRoom = async (codeAndKeyString: string) => {
    sfx.playClick();

    disconnectPeer();

    let code = '';
    let keyHex = '';

    let cleanString = codeAndKeyString.trim();
    if (cleanString.includes('#')) {
      cleanString = cleanString.split('#')[1];
    } else if (cleanString.includes('://')) {
      try {
        const url = new URL(cleanString);
        cleanString = url.hash.substring(1);
      } catch (e) {}
    }

    if (cleanString.includes('!')) {
      const parts = cleanString.split('!');
      code = parts[0].trim();
      keyHex = parts[1].trim();
    } else {
      code = cleanString.trim();
    }

    if (!/^\d{6}$/.test(code)) {
      setErrorMessage('Room code must be a 6-digit number.');
      sfx.playError();
      return;
    }

    setRoomId(code);

    try {
      if (keyHex) {
        // Strong Key from url/hash link
        const key = await importKeyFromHex(keyHex);
        aesKeyRef.current = key;
        setEncryptionKey(keyHex);
        setHasWeakKey(false);
      } else {
        // Secure ECDH Handshake room
        console.log('Pre-shared key not found. Preparing ECDH handshake...');
        const pair = await generateEcdhKeyPair();
        ecdhKeyPairRef.current = pair;
        setEncryptionKey(null);
        setHasWeakKey(false);
      }

      connectSignaling(code, false);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to initialize decryption keys.');
      sfx.playError();
    }
  };

  const sendAvatarMove = (x: number, y: number) => {
    if (channelRef.current && channelRef.current.readyState === 'open') {
      channelRef.current.send(JSON.stringify({ type: 'avatar-move', x, y }));
    }
  };

  const sendAvatarChat = (text: string) => {
    if (channelRef.current && channelRef.current.readyState === 'open') {
      channelRef.current.send(JSON.stringify({ type: 'avatar-chat', text }));
    }
  };

  const registerAvatarCallbacks = (
    onMove: (x: number, y: number) => void,
    onChat: (text: string) => void
  ) => {
    peerAvatarMoveCallbackRef.current = onMove;
    peerAvatarChatCallbackRef.current = onChat;
    return () => {
      peerAvatarMoveCallbackRef.current = null;
      peerAvatarChatCallbackRef.current = null;
    };
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
        sendAvatarMove,
        sendAvatarChat,
        registerAvatarCallbacks,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
