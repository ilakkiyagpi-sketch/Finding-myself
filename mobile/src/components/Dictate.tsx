import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Btn, Chip, Row, T } from './ui';
import { getLang } from '../lib/i18n';

const LANGS = [
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'en-IN', label: 'English' },
];

/** Speak instead of typing: appends what was said (Tamil or English) to the text. */
export default function Dictate({ onText, label = '🎤 Speak instead of typing', hint }: { onText: (spoken: string) => void; label?: string; hint?: string }) {
  const [lang, setLang] = useState(getLang() === 'ta' ? 'ta-IN' : 'en-IN');
  const [listening, setListeningState] = useState(false);
  // Only the button that started listening reacts to speech results.
  const active = useRef(false);
  const setListening = (v: boolean) => {
    active.current = v;
    setListeningState(v);
  };
  const [partial, setPartial] = useState('');
  const [err, setErr] = useState('');

  useSpeechRecognitionEvent('result', (e) => {
    if (!active.current) return;
    const text = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      if (text.trim()) onText(text.trim());
      setPartial('');
    } else setPartial(text);
  });
  useSpeechRecognitionEvent('end', () => active.current && setListening(false));
  useSpeechRecognitionEvent('error', (e) => {
    if (!active.current) return;
    setListening(false);
    setErr(
      e.error === 'language-not-supported'
        ? 'This language isn’t installed for speech on your phone. In Android settings → Speech / Google voice typing, add Tamil (offline).'
        : e.error === 'no-speech'
          ? 'I didn’t hear anything — try again.'
          : e.error === 'not-allowed'
            ? 'Microphone permission is needed to speak your journal.'
            : `Speech stopped (${e.error}).`,
    );
  });

  if (Platform.OS === 'web') return null;

  const start = async () => {
    setErr('');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return setErr('Microphone permission is needed to speak your journal.');
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return setErr('Speech recognition isn’t available on this phone.');
    ExpoSpeechRecognitionModule.start({ lang, interimResults: true, continuous: true, addsPunctuation: true });
    setListening(true);
  };

  return (
    <View style={{ marginVertical: 6 }}>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        {listening ? (
          <Btn primary title="⏹ Stop speaking" onPress={() => ExpoSpeechRecognitionModule.stop()} />
        ) : (
          <Btn title={label} onPress={start} />
        )}
        {!listening &&
          LANGS.map((l) => <Chip key={l.code} label={l.label} on={lang === l.code} onPress={() => setLang(l.code)} />)}
      </Row>
      {listening && <T small muted style={{ marginTop: 4 }}>{partial ? `“${partial}…”` : hint ?? 'Listening… speak naturally.'}</T>}
      {!!err && <T small muted style={{ marginTop: 4 }}>{err}</T>}
    </View>
  );
}
