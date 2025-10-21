import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function AuthDebug() {
  const { user, loading, ensureAnonymous, linkEmailPassword, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Loading: {loading ? 'yes' : 'no'}</Text>
      <Text>User: {user ? (user.isAnonymous ? `anon (${user.uid})` : user.email ?? user.uid) : 'none'}</Text>

      <View style={{ marginVertical: 8 }} />
      <Button title="Ensure Anonymous" onPress={async () => { setMsg(null); try { await ensureAnonymous(); setMsg('Signed in anonymously'); } catch(e:any){ setMsg(e.message); } }} />

      <View style={{ height: 12 }} />
      <Text style={{ marginTop: 12 }}>Create / Link account (email+password)</Text>
      <TextInput placeholder="email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={{borderWidth:1,padding:8,marginVertical:8}} />
      <TextInput placeholder="password" value={password} onChangeText={setPassword} secureTextEntry style={{borderWidth:1,padding:8,marginBottom:8}} />

      <Button title="Link anon -> Email" onPress={async () => {
        setMsg(null);
        try { await linkEmailPassword(email.trim(), password); setMsg('Linked and signed in'); }
        catch(e:any){ setMsg(e.message || 'error'); }
      }} />

      <View style={{ height: 8 }} />
      <Button title="Sign In (email)" onPress={async () => { setMsg(null); try { await signIn(email.trim(), password); setMsg('Signed in'); } catch(e:any){ setMsg(e.message); } }} />
      <View style={{ height: 8 }} />
      <Button title="Sign Out" onPress={async () => { setMsg(null); try { await signOut(); setMsg('Signed out'); } catch(e:any){ setMsg(e.message); } }} />

      {msg ? <Text style={{ marginTop: 12, color: 'red' }}>{msg}</Text> : null}
    </View>
  );
}
