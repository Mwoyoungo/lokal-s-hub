/**
 * Utility for playing notification sounds
 */

export function playNotificationSound() {
  try {
    // Create an audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create an oscillator for the bell sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Configure the oscillator for a bell-like sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(830, audioContext.currentTime); // Higher frequency for bell sound
    
    // Configure the gain (volume) envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
    
    // Connect the nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start and stop the sound
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1.5);
    
    console.log('Notification sound played');
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

/**
 * Request permission for browser notifications
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

/**
 * Show a browser notification
 */
export function showBrowserNotification(title: string, options: NotificationOptions = {}) {
  if (Notification.permission === 'granted') {
    // Play the sound
    playNotificationSound();
    
    // Show the notification
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      ...options
    });
    
    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
    
    // Handle click
    notification.onclick = function() {
      window.focus();
      notification.close();
    };
  }
}
