// app/voiceguide.js
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";

const GUIDES = {
  en: {
    label: "English", code: "EN",
    disasters: [
      { id: 1, title: "Earthquake", icon: "earth", color: "#4527A0", steps: ["Earthquake! Stay calm. Do not panic.", "Step 1. Drop to your hands and knees immediately.", "Step 2. Take cover under a sturdy desk or table. Protect your head and neck.", "Step 3. Hold on until the shaking stops. Do not run outside.", "Step 4. Stay away from windows, heavy furniture, and outer walls.", "Step 5. After shaking stops, check for injuries. Then evacuate carefully.", "Proceed to the nearest CTU Danao evacuation area. Stay safe."] },
      { id: 2, title: "Typhoon", icon: "weather-tornado", color: "#1565C0", steps: ["Typhoon warning! Please stay calm and listen carefully.", "Step 1. Stay indoors. Do not go outside during the storm.", "Step 2. Stay away from windows and glass doors.", "Step 3. Unplug all electrical appliances immediately.", "Step 4. Monitor updates through your radio or phone.", "Step 5. If flooding begins inside, move to the highest floor.", "Wait for the official all-clear before going outside. Stay safe."] },
      { id: 3, title: "Flood", icon: "home-flood", color: "#00838F", steps: ["Flood alert! Please act immediately.", "Step 1. Move to higher ground right away. Do not wait.", "Step 2. Never walk or drive through floodwater.", "Step 3. Stay away from floodwater near electrical equipment.", "Step 4. If trapped, go to the roof and signal for help.", "Step 5. Avoid using your phone except for emergencies.", "Proceed to the nearest evacuation center. You are not alone."] },
      { id: 4, title: "Fire", icon: "fire", color: "#BF360C", steps: ["Fire emergency! Stay calm and act fast.", "Step 1. Activate the fire alarm and call 9-1-1 immediately.", "Step 2. Feel doors before opening. If hot, use another exit.", "Step 3. Stay low where the air is cleaner. Crawl if there is smoke.", "Step 4. Never use elevators during a fire. Use the stairs only.", "Step 5. If your clothes catch fire, stop, drop, and roll.", "Proceed to the campus assembly area. Help is on the way."] },
      { id: 5, title: "Landslide", icon: "landslide", color: "#4E342E", steps: ["Landslide warning! Evacuate immediately.", "Step 1. Move away from the slide path. Go to higher ground sideways.", "Step 2. If you hear rumbling sounds, run immediately.", "Step 3. Watch for collapsed roads and mud on roads if driving.", "Step 4. Be alert for flooding after the landslide.", "Step 5. If caught, curl into a ball and protect your head.", "Report to the nearest evacuation center. Stay safe."] },
    ],
  },
  ceb: {
    label: "Cebuano", code: "CEB",
    disasters: [
      { id: 1, title: "Linog", icon: "earth", color: "#4527A0", steps: ["Linog! Magpabilin nga luwas. Ayaw pagkalisang.", "Unang lakang. Lumuhod dayon sa imong mga kamot ug tuhod.", "Ikaduhang lakang. Magtago sa ilalom sa mesa o lamesa. Protektahan ang imong ulo.", "Ikatlong lakang. Magpabilin hangtod mohunong ang pagkurog. Ayaw pagdagan sa gawas.", "Ikaupat nga lakang. Palayo sa mga bintana ug dagkong muwebles.", "Ikalimang lakang. Pagkahuman sa pagkurog, tan-awa ang mga samad. Dayon luwas nga mogawas.", "Adto sa pinakamalapit nga lugar sa paglikas sa CTU Danao. Magpabilin nga luwas."] },
      { id: 2, title: "Bagyo", icon: "weather-tornado", color: "#1565C0", steps: ["Pahimangno sa bagyo! Magpabilin nga luwas ug pamati pag-ayo.", "Unang lakang. Magpabilin sa sulod sa balay. Ayaw paggawas sa panahon sa bagyo.", "Ikaduhang lakang. Palayo sa mga bintana ug puwertang bildo.", "Ikatlong lakang. I-unplug ang tanan nga elektrikal nga kagamitan.", "Ikaupat nga lakang. Bantayan ang mga update pinaagi sa radyo o telepono.", "Ikalimang lakang. Kung mag-baha sa sulod, adto sa pinakataas nga salog.", "Maghulat sa opisyal nga pahimangno sa dili pa mogawas. Magpabilin nga luwas."] },
      { id: 3, title: "Baha", icon: "home-flood", color: "#00838F", steps: ["Pahimangno sa baha! Molihok dayon.", "Unang lakang. Adto sa mas taas nga lugar dayon. Ayaw paghulat.", "Ikaduhang lakang. Ayaw paglakaw o pagmaneho sa baha.", "Ikatlong lakang. Palayo sa baha duol sa mga kagamitang elektrikal.", "Ikaupat nga lakang. Kung nabakos, adto sa atop ug mangayo og tabang.", "Ikalimang lakang. Gamiton lang ang telepono alang sa mga emerhensya.", "Adto sa pinakamalapit nga sentro sa paglikas. Dili ka nag-inusara."] },
      { id: 4, title: "Sunog", icon: "fire", color: "#BF360C", steps: ["Emerhensya sa sunog! Magpabilin nga luwas ug molihok dayon.", "Unang lakang. I-activate ang fire alarm ug tawagan ang 9-1-1 dayon.", "Ikaduhang lakang. Hawiri ang mga puwerta sa dili pa ablihan. Kung init, gamita ang laing exit.", "Ikatlong lakang. Magpabilin sa ubos diin mas limpyo ang hangin. Mugko kung adunay aso.", "Ikaupat nga lakang. Ayaw gamita ang elevator sa panahon sa sunog. Gamiton lang ang hagdan.", "Ikalimang lakang. Kung mag-sunog ang imong sinina, hunong, lutaw, ug libot.", "Adto sa lugar sa pagtipon sa kampus. Ang tabang nagaabot na."] },
      { id: 5, title: "Landslide", icon: "landslide", color: "#4E342E", steps: ["Pahimangno sa landslide! Moliyok dayon.", "Unang lakang. Palayo sa agianan sa landslide. Adto sa mas taas nga lugar sa kilid.", "Ikaduhang lakang. Kung makadungog og dagingdong, modagan dayon.", "Ikatlong lakang. Bantayan ang mga nahulog nga dalan ug lapok kung nagmaneho.", "Ikaupat nga lakang. Mag-amping sa baha pagkahuman sa landslide.", "Ikalimang lakang. Kung nabakos, magkulob ug protektahan ang imong ulo.", "Mag-report sa pinakamalapit nga sentro sa paglikas. Magpabilin nga luwas."] },
    ],
  },
  fil: {
    label: "Tagalog", code: "FIL",
    disasters: [
      { id: 1, title: "Lindol", icon: "earth", color: "#4527A0", steps: ["Lindol! Manatiling kalmado. Huwag matakot.", "Unang hakbang. Lumuhod agad sa iyong mga kamay at tuhod.", "Ikalawang hakbang. Magtago sa ilalim ng matibay na mesa. Protektahan ang ulo at leeg.", "Ikatlong hakbang. Manatili hanggang huminto ang pagyanig. Huwag tumakbo palabas.", "Ikaapat na hakbang. Lumayo sa mga bintana at mabibigat na kasangkapan.", "Ikalimang hakbang. Pagkatapos ng pagyanig, suriin ang mga sugat. Maingat na lumabas.", "Pumunta sa pinakamalapit na lugar ng paglikas sa CTU Danao. Manatiling ligtas."] },
      { id: 2, title: "Bagyo", icon: "weather-tornado", color: "#1565C0", steps: ["Babala sa bagyo! Manatiling kalmado at makinig nang mabuti.", "Unang hakbang. Manatili sa loob ng bahay. Huwag lumabas habang may bagyo.", "Ikalawang hakbang. Lumayo sa mga bintana at salamin na pinto.", "Ikatlong hakbang. I-unplug ang lahat ng elektrikal na kagamitan.", "Ikaapat na hakbang. Subaybayan ang mga update sa radyo o telepono.", "Ikalimang hakbang. Kung may baha sa loob, pumunta sa pinakamataas na palapag.", "Hintayin ang opisyal na pahintulot bago lumabas. Manatiling ligtas."] },
      { id: 3, title: "Baha", icon: "home-flood", color: "#00838F", steps: ["Babala sa baha! Kumilos agad.", "Unang hakbang. Pumunta sa mas mataas na lugar agad. Huwag mag-antay.", "Ikalawang hakbang. Huwag lumakad o magmaneho sa tubig-baha.", "Ikatlong hakbang. Lumayo sa tubig-baha malapit sa mga elektrikal na kagamitan.", "Ikaapat na hakbang. Kung nakulong, pumunta sa bubong at humingi ng tulong.", "Ikalimang hakbang. Gamitin ang telepono para sa mga emergency lamang.", "Pumunta sa pinakamalapit na sentro ng paglikas. Hindi ka nag-iisa."] },
      { id: 4, title: "Sunog", icon: "fire", color: "#BF360C", steps: ["Emergency sa sunog! Manatiling kalmado at kumilos agad.", "Unang hakbang. I-activate ang fire alarm at tumawag sa 9-1-1 agad.", "Ikalawang hakbang. Hawiin ang mga pinto bago buksan. Kung mainit, gumamit ng ibang labasan.", "Ikatlong hakbang. Manatili sa mababa kung saan mas malinis ang hangin. Gumapang kung may usok.", "Ikaapat na hakbang. Huwag gumamit ng elevator sa panahon ng sunog. Gamitin ang hagdan.", "Ikalimang hakbang. Kung sumunog ang damit, huminto, gumulong, at dumapa.", "Pumunta sa assembly area ng kampus. Paparating na ang tulong."] },
      { id: 5, title: "Landslide", icon: "landslide", color: "#4E342E", steps: ["Babala sa landslide! Lumikas agad.", "Unang hakbang. Lumayo sa landslide path. Pumunta sa mas mataas na lugar sa gilid.", "Ikalawang hakbang. Kung marinig ang dagundong, tumakbo agad.", "Ikatlong hakbang. Bantayan ang mga gumuho na daan at putik kung nagmamaneho.", "Ikaapat na hakbang. Mag-ingat sa baha pagkatapos ng landslide.", "Ikalimang hakbang. Kung nakulong, yumuko at protektahan ang ulo.", "Mag-report sa pinakamalapit na sentro ng paglikas. Manatiling ligtas."] },
    ],
  },
};

const VA_QUICK_QUESTIONS = [
  "What should I do during an earthquake?",
  "What should I pack in a go bag?",
  "What should I do during a flood?",
];

export default function VoiceGuide() {
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Hi, I am Lifeline VA. Ask me about earthquakes, floods, fire, typhoons, first aid, go bags, evacuation, or SOS.");
  const { language, updateLanguage, theme, t } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;

  const currentGuide = GUIDES[language];

  useEffect(() => { return () => { Speech.stop(); }; }, []);

  const speakSteps = async (disaster, stepIndex = 0) => {
    if (stepIndex >= disaster.steps.length) {
      setIsSpeaking(false); setCurrentStep(0); return;
    }
    setIsSpeaking(true); setCurrentStep(stepIndex);
    const langCode = language === "en" ? "en-US" : "fil-PH";
    Speech.speak(disaster.steps[stepIndex], {
      language: langCode, rate: 0.85, pitch: 1.0,
      onDone: () => speakSteps(disaster, stepIndex + 1),
      onError: () => { setIsSpeaking(false); setCurrentStep(0); },
    });
  };

  const stopSpeaking = () => { Speech.stop(); setIsSpeaking(false); setCurrentStep(0); };

  const speakText = (text) => {
    Speech.stop();
    const langCode = language === "en" ? "en-US" : "fil-PH";
    Speech.speak(text, { language: langCode, rate: 0.85, pitch: 1.0 });
  };

  const getAnswer = (input) => {
    const q = input.toLowerCase();

    if (q.includes("earthquake") || q.includes("linog") || q.includes("lindol") || q.includes("shake")) {
      return "During an earthquake, drop to the ground, cover your head and neck under sturdy furniture, and hold on until shaking stops. Stay away from windows.";
    }
    if (q.includes("go bag") || q.includes("kit") || q.includes("pack")) {
      return "Pack water, ready-to-eat food, flashlight, batteries, first aid kit, whistle, power bank, IDs, cash, medicine, masks, clothes, and important documents.";
    }
    if (q.includes("flood") || q.includes("baha")) {
      return "During a flood, move to higher ground, avoid walking or driving through floodwater, unplug appliances if safe, and follow evacuation orders.";
    }
    if (q.includes("fire") || q.includes("sunog") || q.includes("smoke")) {
      return "During a fire, evacuate using stairs, stay low under smoke, never use elevators, and call emergency responders once you are safe.";
    }
    if (q.includes("typhoon") || q.includes("bagyo") || q.includes("storm")) {
      return "During a typhoon, stay indoors, keep away from windows, charge your phone and power bank, prepare supplies, and monitor official updates.";
    }
    if (q.includes("first aid") || q.includes("bleed") || q.includes("wound") || q.includes("burn")) {
      return "For first aid, keep the person calm. Apply firm pressure to bleeding, cool minor burns with running water, and call trained responders for serious injuries.";
    }
    if (q.includes("evacuate") || q.includes("evacuation") || q.includes("route")) {
      return "For evacuation, bring your go bag, follow official routes, avoid danger zones, help others when safe, and check in with family after reaching safety.";
    }
    if (q.includes("sos") || q.includes("help") || q.includes("emergency")) {
      return "If you need urgent help, use the SOS button or call 911. Share your location and stay in the safest nearby place while waiting for responders.";
    }

    return "I can answer questions about earthquakes, floods, fire, typhoons, first aid, go bags, evacuation, and SOS. Try asking about one of those topics.";
  };

  const askVA = (value = question) => {
    const clean = value.trim();
    if (!clean) {
      speakText(answer);
      return;
    }
    const nextAnswer = getAnswer(clean);
    setQuestion(clean);
    setAnswer(nextAnswer);
    speakText(nextAnswer);
  };

  const handleDisasterPress = (disaster) => {
    setSelectedDisaster(disaster); setCurrentStep(0); stopSpeaking();
  };

  if (selectedDisaster) {
    return (
      <View style={[styles.wrapper, { backgroundColor: bg }]}>
        <View style={[styles.detailHeader, { backgroundColor: selectedDisaster.color }]}>
          <TouchableOpacity onPress={() => { stopSpeaking(); setSelectedDisaster(null); }} style={styles.backButton}>
            <Text style={styles.backText}>← {t("back")}</Text>
          </TouchableOpacity>
          <MaterialCommunityIcons name={selectedDisaster.icon} size={55} color="#fff" style={styles.detailIcon} />
          <Text style={styles.detailTitle}>{selectedDisaster.title}</Text>
          <Text style={styles.detailSub}>{t("voice_detail_sub")}</Text>
        </View>

        <View style={styles.controls}>
          {!isSpeaking ? (
            <TouchableOpacity style={styles.speakButton} onPress={() => speakSteps(selectedDisaster)}>
              <Ionicons name="volume-high" size={24} color="#fff" style={styles.speakButtonIcon} />
              <Text style={styles.speakButtonText}>{t("start_voice")}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.speakButton, { backgroundColor: "#e53935" }]} onPress={stopSpeaking}>
              <Ionicons name="stop" size={24} color="#fff" style={styles.speakButtonIcon} />
              <Text style={styles.speakButtonText}>{t("stop")}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={[styles.stepsContainer, { backgroundColor: bg }]}>
          {selectedDisaster.steps.map((step, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.stepCard,
                { backgroundColor: card, borderColor: border },
                currentStep === index && isSpeaking && {
                  backgroundColor: selectedDisaster.color + "22",
                  borderColor: selectedDisaster.color, borderWidth: 2,
                },
              ]}
              onPress={() => speakSteps(selectedDisaster, index)}
            >
              <View style={[styles.stepNumber, { backgroundColor: selectedDisaster.color }]}>
                <Text style={styles.stepNumberText}>
                  {currentStep === index && isSpeaking ? <Ionicons name="volume-high" size={16} color="#fff" /> : index + 1}
                </Text>
              </View>
              <Text style={[styles.stepText, { color: textDark }]}>{step}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="account-voice" size={24} color="#fff" />
          <Text style={styles.headerTitle}>{t("voice_guide")}</Text>
        </View>
        <Text style={styles.headerSub}>Ask questions or play step-by-step safety instructions</Text>
      </View>

      <View style={[styles.vaCard, { backgroundColor: card, borderColor: border }]}>
        <View style={[styles.vaIcon, { backgroundColor: surface }]}>
          <MaterialCommunityIcons name="account-voice" size={26} color={COLORS.primary} />
        </View>
        <View style={styles.vaContent}>
          <Text style={[styles.vaTitle, { color: textDark }]}>Lifeline VA</Text>
          <Text style={[styles.vaAnswer, { color: textMid }]}>{answer}</Text>
        </View>
        <TouchableOpacity style={styles.vaSpeakButton} onPress={() => speakText(answer)}>
          <Ionicons name="volume-high" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.askCard, { backgroundColor: card, borderColor: border }]}>
        <View style={[styles.askInputRow, { backgroundColor: surface, borderColor: border }]}>
          <TextInput
            style={[styles.askInput, { color: textDark }]}
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask Lifeline VA..."
            placeholderTextColor={textLight}
            returnKeyType="send"
            onSubmitEditing={() => askVA()}
          />
          <TouchableOpacity style={styles.askButton} onPress={() => askVA()}>
            <Ionicons name="send" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.quickQuestionRow}>
          {VA_QUICK_QUESTIONS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.quickQuestion, { backgroundColor: surface, borderColor: border }]}
              onPress={() => askVA(item)}
            >
              <Text style={[styles.quickQuestionText, { color: textDark }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* LANGUAGE SELECTOR */}
      <View style={styles.langContainer}>
        <View style={styles.langLabelRow}>
          <MaterialCommunityIcons name="web" size={16} color={textDark} />
          <Text style={[styles.langLabel, { color: textDark }]}>{t("select_language")}</Text>
        </View>
        <View style={styles.langButtons}>
          {Object.entries(GUIDES).map(([key, val]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.langButton,
                { borderColor: border, backgroundColor: surface },
                language === key && styles.langButtonActive,
              ]}
              onPress={() => { updateLanguage(key); stopSpeaking(); }}
            >
              <Text style={[styles.langFlag, language === key && { color: "#fff" }]}>{val.code}</Text>
              <Text style={[styles.langText, { color: textMid }, language === key && { color: "#fff" }]}>
                {val.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* INFO CARD */}
      <View style={[styles.infoCard, {
        backgroundColor: theme.bg === "#121212" ? "#0d2137" : "#E3F2FD",
        borderColor: theme.bg === "#121212" ? "#1a4a7a" : "#90CAF9",
      }]}>
        <MaterialCommunityIcons name="lightbulb" size={28} color="#1565C0" style={styles.infoIcon} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoTitle, { color: "#1565C0" }]}>{t("how_to_use")}</Text>
          <Text style={[styles.infoDesc, { color: textMid }]}>
            {t("voice_how_desc")}
          </Text>
        </View>
      </View>

      <ScrollView style={[styles.container, { backgroundColor: bg }]}>
        <Text style={[styles.sectionTitle, { color: textDark }]}>{t("choose_disaster")}</Text>
        {currentGuide.disasters.map((disaster) => (
          <TouchableOpacity
            key={disaster.id}
            style={[styles.disasterCard, { backgroundColor: card, borderLeftColor: disaster.color }]}
            onPress={() => handleDisasterPress(disaster)}
          >
            <View style={[styles.disasterIcon, { backgroundColor: disaster.color + "20" }]}>
              <MaterialCommunityIcons name={disaster.icon} size={28} color={disaster.color} />
            </View>
            <View style={styles.disasterContent}>
              <Text style={[styles.disasterTitle, { color: textDark }]}>{disaster.title}</Text>
              <Text style={[styles.disasterSub, { color: textLight }]}>
                {disaster.steps.length} {t("steps_tap")}
              </Text>
            </View>
            <Ionicons name="volume-high" size={22} color={disaster.color} style={styles.disasterArrow} />
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: { backgroundColor: COLORS.primary, paddingTop: 55, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, marginBottom: 15 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  vaCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  vaIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  vaContent: { flex: 1 },
  vaTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 3 },
  vaAnswer: { fontSize: 12, lineHeight: 18 },
  vaSpeakButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  askCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  askInputRow: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
  },
  askInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  askButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  quickQuestionRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 },
  quickQuestion: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  quickQuestionText: { fontSize: 11, fontWeight: "700" },
  langContainer: { paddingHorizontal: 20, marginBottom: 15 },
  langLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  langLabel: { fontWeight: "bold", fontSize: 14 },
  langButtons: { flexDirection: "row", gap: 10 },
  langButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: 12, borderWidth: 1.5 },
  langButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  langFlag: { fontSize: 12, fontWeight: "bold", color: COLORS.primary },
  langText: { fontWeight: "bold", fontSize: 12 },
  infoCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginHorizontal: 20, marginBottom: 15, borderWidth: 1 },
  infoIcon: { marginRight: 12 },
  infoContent: { flex: 1 },
  infoTitle: { fontWeight: "bold", fontSize: 13 },
  infoDesc: { fontSize: 12, marginTop: 3, lineHeight: 18 },
  container: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  disasterCard: { flexDirection: "row", alignItems: "center", borderRadius: 15, padding: 15, marginBottom: 12, borderLeftWidth: 5, elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  disasterIcon: { width: 55, height: 55, borderRadius: 15, justifyContent: "center", alignItems: "center", marginRight: 14 },
  disasterContent: { flex: 1 },
  disasterTitle: { fontWeight: "bold", fontSize: 16 },
  disasterSub: { fontSize: 12, marginTop: 3 },
  disasterArrow: {},
  detailHeader: { padding: 20, paddingTop: 55, alignItems: "center", borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  backButton: { position: "absolute", top: 50, left: 20 },
  backText: { color: "rgba(255,255,255,0.85)", fontSize: 16 },
  detailIcon: { marginBottom: 8 },
  detailTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  detailSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  controls: { padding: 20 },
  speakButton: { backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 15, elevation: 4, shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
  speakButtonIcon: {},
  speakButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  stepsContainer: { flex: 1, paddingHorizontal: 20 },
  stepCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  stepNumber: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  stepNumberText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
