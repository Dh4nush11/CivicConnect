export default function captureDeviceLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Device location is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        capturedAt: new Date().toISOString(),
      }),
      reject,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );
  });
}
