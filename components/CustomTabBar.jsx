import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { COLORS } from "../constants/colors";

const { width } = Dimensions.get("window");
const TAB_BAR_MARGIN = 20;
const TAB_BAR_WIDTH = width - TAB_BAR_MARGIN * 2;

export default function CustomTabBar({ state, descriptors, navigation }) {
  const tabWidth = TAB_BAR_WIDTH / state.routes.length;
  const translateX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    translateX.value = withSpring(state.index * tabWidth, {
      damping: 20,
      stiffness: 150,
    });
  }, [state.index, tabWidth, translateX]);

  const animatedPillStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={styles.tabBarContainer}>
      <Animated.View
        style={[
          styles.slidingPill,
          { width: tabWidth - 10 },
          animatedPillStyle,
        ]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        let iconName = "help-circle";
        if (route.name === "home") iconName = "home";
        else if (route.name === "calendar") iconName = "calendar";
        else if (route.name === "stats") iconName = "bar-chart";
        else if (route.name === "history") iconName = "list";
        else if (route.name === "profile_tab") iconName = "person";

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={isFocused ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? COLORS.primary : COLORS.textMuted },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    height: Platform.OS === "ios" ? 84 : 64,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    paddingTop: 10,
    position: "absolute",
    bottom: 30,
    left: TAB_BAR_MARGIN,
    right: TAB_BAR_MARGIN,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  slidingPill: {
    position: "absolute",
    height: "80%",
    top: "10%",
    left: 5,
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    borderRadius: 15,
  },
});
