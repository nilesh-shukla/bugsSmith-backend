const BASE = 'http://localhost:3000';

async function main(){
  try{
    const email = `test+bot+${Date.now()}@example.com`;
    const password = 'Passw0rd!';

    console.log('Registering user', email);
    const regRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Test', lastName: 'Bot', email, password, cpassword: password, role: 'user' })
    });
    const regBody = await regRes.json();
    if (!regRes.ok) {
      console.error('Register failed', regBody);
      return process.exit(1);
    }
    const accessToken = regBody?.data?.tokens?.accessToken;
    if (!accessToken) {
      console.error('No access token returned', regBody);
      return process.exit(1);
    }

    console.log('Access token obtained. Starting upload...');

    const profiles = [
      { userName: 'u1', displayName: 'User One', followers: 10, following: 2, posts: 5, bio: 'bio 1' },
      { userName: 'u2', displayName: 'User Two', followers: 20, following: 5, posts: 3, bio: 'bio 2' },
      { userName: 'u3', displayName: 'User Three', followers: 5, following: 1, posts: 1, bio: 'bio 3' }
    ];

    const uploadRes = await fetch(`${BASE}/api/upload/upload-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ profiles, type: 'test' })
    });

    const uploadBody = await uploadRes.json();
    console.log('Upload response status:', uploadRes.status);
    console.log(JSON.stringify(uploadBody, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Test script error:', err);
    process.exit(1);
  }
}

main();
