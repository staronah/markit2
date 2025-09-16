export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface CurrentSession {
  active: boolean;
  cardId: string;
  createdAt: number; // Using this as the session identifier
  hostId: string;
  hostName: string;
  location: GeoLocation;
  maxDistance: number;
}

export interface DeviceInfo {
  os: string;
  browser: string;
  userAgent: string;
}

export interface AttendanceRecord {
  sessionId: number; // The session's createdAt timestamp
  timestamp: string; // The time the user marked attendance
  location: GeoLocation;
  deviceInfo: DeviceInfo;
  // For the global log, we add user info
  userId?: string;
  userName?: string;
}


export interface User {
  id: string;
  name:string;
  timestamp: string;
  sessionId?: string;
  attendance?: {
    [recordId: string]: AttendanceRecord; // Key is Firebase push ID
  }
}