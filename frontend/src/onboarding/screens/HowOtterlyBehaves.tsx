import React from "react";
import { Text, View } from "react-native";
import { C, OnbButton, Screen, tx } from "../ui";
import { strings } from "../strings";

// S7 How Otterly behaves — Tier 3 made visible once, as a binary. Anti-hustle
// positioning: state what Otterly will never do. Neither answer is preselected;
// "Stay quiet" costs nothing. On tap, the flow ends inside the product.
export function HowOtterlyBehaves({ onChoose }: { onChoose: (checkins: boolean) => void }) {
  const s = strings.s7;
  return (
    <Screen bg={C.screen}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={[tx.headline, { textAlign: "center" }]}>{s.headline}</Text>
        <Text style={[tx.support, { marginTop: 14, maxWidth: 260, textAlign: "center" }]}>{s.support}</Text>
      </View>
      <View style={{ gap: 10 }}>
        <OnbButton
          label={s.yes}
          variant="choice"
          onPress={() => onChoose(true)}
          accessibilityLabel="Check in gently"
          testID="onb-s7-yes"
        />
        <OnbButton
          label={s.no}
          variant="choice"
          onPress={() => onChoose(false)}
          accessibilityLabel="Stay quiet"
          testID="onb-s7-no"
        />
      </View>
    </Screen>
  );
}
