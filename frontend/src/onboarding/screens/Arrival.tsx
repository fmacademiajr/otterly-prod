import React from "react";
import { Text, View } from "react-native";
import { C, OnbButton, Screen, tx } from "../ui";
import { strings } from "../strings";

// S1 Arrival — no otter, no logo, no illustration. Lowers threat before anything
// is asked. Nothing animates while the user reads.
export function Arrival({ onNext }: { onNext: () => void }) {
  const s = strings.s1;
  return (
    <Screen bg={C.screen}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={[tx.kicker, { marginBottom: 14 }]}>{s.kicker}</Text>
        <Text style={[tx.headline, { textAlign: "center" }]}>{s.headline}</Text>
        <Text style={[tx.support, { marginTop: 14, textAlign: "center" }]}>{s.support}</Text>
      </View>
      <OnbButton label={s.button} onPress={onNext} accessibilityLabel="Continue" testID="onb-s1-okay" />
    </Screen>
  );
}
