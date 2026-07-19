import React from "react";
import { Text, View } from "react-native";
import { OtterMascot } from "@/src/components/OtterMascot";
import { C, OnbButton, Screen, tx } from "../ui";

// Shown when the S3 task is a crisis / medical / harm disclosure. The Shrinker never
// runs and no "first step / that counts" follows — just the right resource, calmly,
// then into the app. `message` is the backend's refusal text (carries the crisis line
// for a disclosure). No fake win, because there is no task to have done.
export function SafetyPause({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <Screen bg={C.screen}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View style={{ marginBottom: 24 }}>
          <OtterMascot size={104} variant="sit-calm" />
        </View>
        <Text style={[tx.headline, { fontSize: 22, lineHeight: 30, textAlign: "center" }]}>
          {message}
        </Text>
      </View>
      <OnbButton label="Okay" onPress={onDone} accessibilityLabel="Continue" testID="onb-safety-okay" />
    </Screen>
  );
}
