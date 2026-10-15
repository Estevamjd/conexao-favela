import { getDownloadURL, ref } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';

export function ReviewPhoto({ label, value }: { readonly label: string; readonly value: string }) {
  const [uri, setUri] = useState<string | null>(
    value.startsWith('file:') || value.startsWith('blob:') || value.startsWith('http')
      ? value
      : null,
  );

  useEffect(() => {
    if (uri || !hasFirebaseConfig() || !value.startsWith('review-media/')) return undefined;
    let active = true;
    const { storage } = getFirebaseServices();
    void getDownloadURL(ref(storage, value))
      .then((downloadUrl) => {
        if (active) setUri(downloadUrl);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [uri, value]);

  return uri ? <Image accessibilityLabel={label} source={{ uri }} style={styles.image} /> : null;
}

const styles = StyleSheet.create({
  image: { borderRadius: 8, height: 96, width: 120 },
});
