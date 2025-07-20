// WebRTC signaling message types for the Signaling Service

// Base signaling message structure
export interface SignalingMessage<T = any> {
  type: string;
  payload?: T;
}

// Room management messages
export interface JoinRoomPayload {
  roomId: string;
}

export interface JoinRoomMessage extends SignalingMessage<JoinRoomPayload> {
  type: 'join-room';
  payload: JoinRoomPayload;
}

export interface LeaveRoomMessage extends SignalingMessage {
  type: 'leave-room';
}

// WebRTC offer/answer/candidate messages
export interface OfferPayload {
  targetUserId: string;
  sdp: string;
}

export interface OfferMessage extends SignalingMessage<OfferPayload> {
  type: 'offer';
  payload: OfferPayload;
}

export interface AnswerPayload {
  targetUserId: string;
  sdp: string;
}

export interface AnswerMessage extends SignalingMessage<AnswerPayload> {
  type: 'answer';
  payload: AnswerPayload;
}

export interface IceCandidatePayload {
  targetUserId: string;
  candidate: string;
}

export interface IceCandidateMessage extends SignalingMessage<IceCandidatePayload> {
  type: 'ice-candidate';
  payload: IceCandidatePayload;
}

// Union type for all signaling messages
export type WebRTCSignalingMessage = 
  | JoinRoomMessage 
  | LeaveRoomMessage 
  | OfferMessage 
  | AnswerMessage 
  | IceCandidateMessage;

// Data channel message types (for cursor and chat)
export interface CursorUpdateData {
  userId: string;
  x: number;
  y: number;
  nickname: string;
  color: string;
}

export interface ChatMessageData {
  userId: string;
  nickname: string;
  message: string;
  timestamp: number;
}