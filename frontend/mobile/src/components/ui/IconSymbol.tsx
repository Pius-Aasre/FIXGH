import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'] | string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: any;
}) {
  // Simple mapping for the tabs
  let iconName: any = 'help';
  if (name === 'house.fill') iconName = 'home';
  else if (name === 'plus.circle.fill') iconName = 'add-circle';
  else if (name === 'newspaper.fill') iconName = 'newspaper';
  else if (name === 'person.fill') iconName = 'person';

  return <Ionicons color={color} size={size} name={iconName} style={style} />;
}
