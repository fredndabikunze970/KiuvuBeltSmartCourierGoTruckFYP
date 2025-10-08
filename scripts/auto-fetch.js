const API_URL = 'http://localhost:3000/api/packages/auto-transition';

setInterval(async () => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    console.log('Auto-fetch result:', data);
  } catch (error) {
    console.error('Error fetching API:', error);
  }
}, 30000); // 30 seconds

console.log('Starting auto-fetch every 30 seconds...');
