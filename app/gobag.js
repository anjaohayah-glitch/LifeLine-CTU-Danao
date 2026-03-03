import { useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const initialItems = [
  { id: "1", name: "Drinking Water (3 days supply)", checked: false },
  { id: "2", name: "Canned / Ready-to-eat Food", checked: false },
  { id: "3", name: "Flashlight", checked: false },
  { id: "4", name: "Extra Batteries", checked: false },
  { id: "5", name: "First Aid Kit", checked: false },
  { id: "6", name: "Whistle", checked: false },
  { id: "7", name: "Important Documents", checked: false },
  { id: "8", name: "Face Masks", checked: false },
  { id: "9", name: "Powerbank", checked: false },
  { id: "10", name: "Extra Clothes", checked: false },
];

export default function GoBag() {
  const [items, setItems] = useState(initialItems);

  const toggleItem = (id) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updated);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, item.checked && styles.checkedItem]}
      onPress={() => toggleItem(item.id)}
    >
      <Text style={[styles.itemText, item.checked && styles.checkedText]}>
        {item.checked ? "✅ " : "⬜ "} {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Go-Bag Checklist</Text>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#C62828",
    marginBottom: 20,
    textAlign: "center",
  },
  item: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: "#ffe5e5",
  },
  checkedItem: {
    backgroundColor: "#ffcccc",
  },
  itemText: {
    fontSize: 16,
    color: "#333",
  },
  checkedText: {
    textDecorationLine: "line-through",
    color: "#888",
  },
});