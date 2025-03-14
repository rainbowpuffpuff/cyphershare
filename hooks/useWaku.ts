import { useState, useEffect, useCallback } from 'react';
import {
  createLightNode,
  createEncoder,
  createDecoder,
  DecodedMessage,
  LightNode,
  Protocols,
  utils,
} from "@waku/sdk";
import protobuf from "protobufjs";

// Define the FileMessage structure using Protobuf
const FileMessage = new protobuf.Type("FileMessage")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("sender", 2, "string"))
  .add(new protobuf.Field("fileName", 3, "string"))
  .add(new protobuf.Field("fileSize", 4, "float"))
  .add(new protobuf.Field("fileType", 5, "string"))
  .add(new protobuf.Field("fileId", 6, "string")); // CID of the file

// Correct content topic format following Waku protocol specification
// Format: /{application-name}/{version}/{content-topic-name}/{encoding}
const BASE_CONTENT_TOPIC = "/fileshare/1/";

export interface WakuFileMessage {
  timestamp: number;
  sender: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileId: string;
}

export interface UseWakuOptions {
  roomId: string;
  wakuNodeUrl: string;
  wakuNodeType: 'light' | 'relay';
  onFileReceived?: (fileMessage: WakuFileMessage) => void;
}

export const useWaku = ({
  roomId,
  wakuNodeUrl,
  wakuNodeType,
  onFileReceived
}: UseWakuOptions) => {
  const [node, setNode] = useState<LightNode | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentTopic, setContentTopic] = useState<string>(`${BASE_CONTENT_TOPIC}room-${roomId}/proto`);
  const [encoder, setEncoder] = useState<any>(null);
  const [decoder, setDecoder] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [peerCount, setPeerCount] = useState(0);

  // Initialize Waku node
  const initWaku = useCallback(async () => {
    if (wakuNodeType !== 'light') {
      // Only initialize for light node type
      return;
    }

    if (isConnecting || isConnected) {
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Create a new content topic with the current room ID
      // Using correct format: /{application-name}/{version}/{content-topic-name}/{encoding}
      const newContentTopic = `${BASE_CONTENT_TOPIC}room-${roomId}/proto`;
      setContentTopic(newContentTopic);

      // Create a light node with explicit protocols
      console.log('Creating Waku light node...');
      const lightNode = await createLightNode({
        numPeersToUse: 3, // Increase number of peers for better connectivity
        defaultBootstrap: true,
        networkConfig: {
          contentTopics: [newContentTopic],
        },
      });

      // Start the node
      await lightNode.start();
      console.log('Waku node started');

      // Wait for peer connections with timeout
      console.log('Waiting for peers...');
      try {
        // Wait for both protocols with a timeout
        const timeout = 15000; // 15 seconds timeout
        await Promise.race([
          lightNode.waitForPeers([Protocols.LightPush, Protocols.Filter]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Peer connection timeout')), timeout)
          )
        ]);
        console.log('Connected to peers successfully');
      } catch (peerError) {
        console.warn('Peer connection issue:', peerError);
        // Continue anyway, as we might connect to peers later
      }

      // Create encoder and decoder
      const newEncoder = createEncoder({
        contentTopic: newContentTopic,
        ephemeral: true,
      });

      const newDecoder = createDecoder(newContentTopic);

      setNode(lightNode);
      setEncoder(newEncoder);
      setDecoder(newDecoder);
      setIsConnected(true);
      setIsConnecting(false);

      // Update peer count periodically
      const interval = setInterval(async () => {
        if (lightNode) {
          const peers = await lightNode.libp2p.getPeers();
          setPeerCount(peers.length);
          
          // Log connected peers for debugging
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Connected to ${peers.length} Waku peers`);
          }
        }
      }, 5000);

      // Subscribe to messages
      await subscribeToMessages(lightNode, newDecoder, newContentTopic);
      console.log('Message subscription setup complete');

      return () => {
        clearInterval(interval);
        if (subscription) {
          subscription.unsubscribe();
        }
        if (lightNode) {
          lightNode.stop();
        }
      };
    } catch (err) {
      console.error('Error initializing Waku:', err);
      setError(err instanceof Error ? err.message : 'Unknown error initializing Waku');
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [roomId, wakuNodeUrl, wakuNodeType, isConnecting, isConnected]);

  // Subscribe to messages
  const subscribeToMessages = async (lightNode: LightNode, messageDecoder: any, topic: string) => {
    try {
      // Create the callback function to process incoming messages
      const subscriptionCallback = async (wakuMessage: DecodedMessage) => {
        if (!wakuMessage.payload) return;
        
        try {
          // Decode the message
          const messageObj = FileMessage.decode(wakuMessage.payload) as unknown as WakuFileMessage;
          console.log('Received file message:', messageObj);
          
          // Call the onFileReceived callback if provided
          if (onFileReceived) {
            onFileReceived(messageObj);
          }
        } catch (err) {
          console.error('Error decoding message:', err);
        }
      };

      // Subscribe to messages using the filter protocol
      console.log('Subscribing to filter messages on topic:', topic);
      
      try {
        // Direct subscription to the filter protocol
        await lightNode.filter.subscribe(messageDecoder, subscriptionCallback);
        console.log('Successfully subscribed to filter messages');
      } catch (subscribeError) {
        console.error('Direct filter subscription failed:', subscribeError);
        
        // Fallback approach - try alternative subscription methods
        try {
          console.log('Trying alternative subscription method...');
          // @ts-ignore - API might have changed between versions
          const sub = await lightNode.filter.createSubscription();
          if (sub) {
            await sub.subscribe([messageDecoder], subscriptionCallback);
            setSubscription(sub);
            console.log('Successfully subscribed using alternative method');
          } else {
            throw new Error('Failed to create subscription object');
          }
        } catch (fallbackError) {
          console.error('All subscription methods failed:', fallbackError);
          setError('Failed to subscribe to messages: ' + (fallbackError instanceof Error ? fallbackError.message : String(fallbackError)));
        }
      }
    } catch (err) {
      console.error('Error in message subscription process:', err);
      setError(err instanceof Error ? err.message : 'Unknown error subscribing to messages');
    }
  };

  // Send a file message
  const sendFileMessage = useCallback(async (fileData: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileId: string;
  }) => {
    if (!node || !encoder || !isConnected) {
      console.error('Cannot send message: Waku node is not connected', { node: !!node, encoder: !!encoder, isConnected });
      setError('Waku node is not connected');
      return false;
    }

    try {
      console.log('Preparing to send file message:', fileData);
      
      // Generate a unique sender ID if not already available
      // This helps with identifying our own messages
      const senderId = localStorage.getItem('wakuSenderId') || `user-${Math.random().toString(36).substring(2, 10)}`;
      if (!localStorage.getItem('wakuSenderId')) {
        localStorage.setItem('wakuSenderId', senderId);
      }
      
      // Create a new message object
      const protoMessage = FileMessage.create({
        timestamp: Date.now(),
        sender: senderId, // Use the unique sender ID
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        fileType: fileData.fileType,
        fileId: fileData.fileId,
      });

      // Serialize the message using Protobuf
      const serializedMessage = FileMessage.encode(protoMessage).finish();
      
      console.log('Sending message with payload size:', serializedMessage.length, 'bytes');
      console.log('Message details:', {
        contentTopic,
        sender: senderId,
        fileName: fileData.fileName,
        fileId: fileData.fileId
      });

      // Send the message using Light Push
      const result = await node.lightPush.send(encoder, {
        payload: serializedMessage,
      });
      
      console.log('File message sent successfully:', result);
      return true;
    } catch (err) {
      console.error('Error sending file message:', err);
      setError(err instanceof Error ? err.message : 'Unknown error sending file message');
      return false;
    }
  }, [node, encoder, isConnected, contentTopic]);

  // Update room ID
  useEffect(() => {
    if (roomId && isConnected) {
      // If room ID changes while connected, reconnect with new room ID
      const newContentTopic = `${BASE_CONTENT_TOPIC}room-${roomId}/proto`;
      if (newContentTopic !== contentTopic) {
        // Clean up existing connection
        if (subscription) {
          subscription.unsubscribe();
        }
        if (node) {
          node.stop();
        }
        
        // Reset state
        setIsConnected(false);
        setNode(null);
        setEncoder(null);
        setDecoder(null);
        setSubscription(null);
        
        // Initialize with new room ID
        initWaku();
      }
    }
  }, [roomId, isConnected, contentTopic, initWaku]);

  // Initialize Waku when component mounts or when wakuNodeType changes
  useEffect(() => {
    if (wakuNodeType === 'light') {
      initWaku();
    } else {
      // Clean up existing connection if switching from light to relay
      if (subscription) {
        subscription.unsubscribe();
      }
      if (node) {
        node.stop();
      }
      
      // Reset state
      setIsConnected(false);
      setNode(null);
      setEncoder(null);
      setDecoder(null);
      setSubscription(null);
    }
    
    // Cleanup function
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (node) {
        node.stop();
      }
    };
  }, [wakuNodeType, initWaku]);

  return {
    isConnecting,
    isConnected,
    error,
    sendFileMessage,
    peerCount,
    contentTopic,
  };
};

export default useWaku; 