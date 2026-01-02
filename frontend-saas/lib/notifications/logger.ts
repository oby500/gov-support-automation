export async function logNotification(_params: any): Promise<void> {
  return;
}

export async function logNotificationAttempt(
  _userId: number,
  _type: any,
  _channel: any,
  _phoneNumber: string,
  _metadata?: Record<string, any>
): Promise<number | null> {
  return null;
}

export async function logNotificationSuccess(_logId: number, _messageId?: string): Promise<void> {
  return;
}

export async function logNotificationFailure(_logId: number, _errorMessage: string): Promise<void> {
  return;
}

export async function getRecentNotifications(_userId: number, _limit: number = 10): Promise<any[]> {
  return [];
}

export async function getFailedNotifications(_hoursAgo: number = 24): Promise<any[]> {
  return [];
}
