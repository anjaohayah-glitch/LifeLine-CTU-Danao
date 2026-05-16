import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";

const KIT_STORAGE_KEY = "kitRushBestScore";
const QUAKE_STORAGE_KEY = "quakeDrillBestScore";
const QUIZ_STORAGE_KEY = "disasterQuizBestScore";
const FIRST_AID_STORAGE_KEY = "firstAidMatchBestScore";
const KIT_SECONDS = 45;
const QUAKE_SECONDS = 30;

const GAMES = [
  {
    id: "kit",
    title: "Kit Rush",
    type: "Timed",
    icon: "bag-personal",
    intro: "Pack only the safe emergency go-bag items before time runs out.",
    va: "Kit Rush. Tap water, food, first aid, flashlight, radio, power bank, IDs, and whistle. Avoid unsafe or fragile items.",
  },
  {
    id: "quake",
    title: "Quake Drill",
    type: "Reflex",
    icon: "earth",
    intro: "Choose the safest Drop, Cover, Hold action for each earthquake scene.",
    va: "Quake Drill. Drop low, cover your head and neck, and hold on until shaking stops.",
  },
  {
    id: "quiz",
    title: "Disaster Quiz",
    type: "Quiz",
    icon: "head-question",
    intro: "Answer fast safety questions and learn the reason behind each choice.",
    va: "Disaster Quiz. Read the question and pick the safest answer. I will explain when you choose.",
  },
  {
    id: "aid",
    title: "First Aid Match",
    type: "Match",
    icon: "medical-bag",
    intro: "Match each emergency with the right first-aid response.",
    va: "First Aid Match. Pick the response that protects the person first, then call for help when needed.",
  },
];

const KIT_ITEMS = [
  { id: "water", name: "Drinking water", icon: "water", safe: true },
  { id: "food", name: "Ready-to-eat food", icon: "food-apple", safe: true },
  { id: "firstaid", name: "First aid kit", icon: "medical-bag", safe: true },
  { id: "flashlight", name: "Flashlight", icon: "flashlight", safe: true },
  { id: "radio", name: "Battery radio", icon: "radio", safe: true },
  { id: "powerbank", name: "Power bank", icon: "battery-charging", safe: true },
  { id: "documents", name: "Important IDs", icon: "card-account-details", safe: true },
  { id: "whistle", name: "Whistle", icon: "whistle", safe: true },
  { id: "candle", name: "Open candle", icon: "candle", safe: false },
  { id: "glass", name: "Glass bottle", icon: "bottle-wine", safe: false },
  { id: "junk", name: "Junk snacks only", icon: "food", safe: false },
  { id: "heels", name: "High heels", icon: "shoe-heel", safe: false },
];

const QUAKE_PROMPTS = [
  { id: "shake", prompt: "Strong shaking starts", answer: "drop", tip: "Drop before the shaking knocks you down." },
  { id: "objects", prompt: "Objects may fall", answer: "cover", tip: "Cover your head and neck under sturdy furniture." },
  { id: "table", prompt: "You are under a table", answer: "hold", tip: "Hold on until the shaking stops." },
  { id: "window", prompt: "You are near windows", answer: "drop", tip: "Drop low and move away from glass if you can." },
  { id: "desk", prompt: "A sturdy desk is nearby", answer: "cover", tip: "Get under cover and protect your head." },
  { id: "aftershock", prompt: "Aftershock hits", answer: "hold", tip: "Stay covered and hold on again." },
];

const QUAKE_ACTIONS = [
  { id: "drop", label: "Drop", icon: "arrow-down-bold-circle", color: COLORS.primary },
  { id: "cover", label: "Cover", icon: "shield-home", color: COLORS.info },
  { id: "hold", label: "Hold", icon: "hand-back-left", color: COLORS.success },
];

const QUIZ_QUESTIONS = [
  {
    id: "flood",
    question: "Floodwater is crossing the road. What should you do?",
    options: ["Find another route", "Walk through quickly", "Drive faster"],
    answer: 0,
    reason: "Never cross floodwater. It can be deeper and stronger than it looks.",
  },
  {
    id: "fire",
    question: "Smoke fills the hallway. What is safest?",
    options: ["Stay low and evacuate", "Use the elevator", "Open every door"],
    answer: 0,
    reason: "Smoke rises, so staying low helps you breathe while moving toward an exit.",
  },
  {
    id: "typhoon",
    question: "A typhoon signal is raised. What should you prepare first?",
    options: ["Charge phone and power bank", "Stand near windows", "Go outside to watch"],
    answer: 0,
    reason: "Charged devices help you receive updates and contact people during power loss.",
  },
  {
    id: "earthquake",
    question: "During strong shaking, what is the best action?",
    options: ["Drop, Cover, Hold", "Run downstairs", "Stand in a doorway"],
    answer: 0,
    reason: "Drop, Cover, Hold protects you from falling and flying objects.",
  },
];

const FIRST_AID_ROUNDS = [
  {
    id: "burn",
    emergency: "Minor burn",
    icon: "fire",
    answer: "cool",
    responses: [
      { id: "cool", label: "Cool with running water", icon: "water" },
      { id: "butter", label: "Put butter on it", icon: "food" },
      { id: "ice", label: "Press ice directly", icon: "snowflake" },
    ],
    reason: "Cool the burn with clean running water. Do not use butter or direct ice.",
  },
  {
    id: "bleed",
    emergency: "Bleeding wound",
    icon: "bandage",
    answer: "pressure",
    responses: [
      { id: "pressure", label: "Apply firm pressure", icon: "hand-back-left" },
      { id: "wash", label: "Keep checking only", icon: "eye" },
      { id: "lift", label: "Shake the limb", icon: "arm-flex" },
    ],
    reason: "Firm pressure with clean cloth helps control bleeding while help is contacted.",
  },
  {
    id: "faint",
    emergency: "Someone feels faint",
    icon: "account-alert",
    answer: "sit",
    responses: [
      { id: "sit", label: "Help them sit or lie down", icon: "seat" },
      { id: "crowd", label: "Crowd around them", icon: "account-group" },
      { id: "run", label: "Make them run", icon: "run" },
    ],
    reason: "Keep them low and calm, loosen tight clothing, and call for help if needed.",
  },
];

const TOTAL_SAFE_ITEMS = KIT_ITEMS.filter((item) => item.safe).length;
const shuffleItems = () => [...KIT_ITEMS].sort(() => Math.random() - 0.5);

export default function Game() {
  const router = useRouter();
  const { theme, voiceSpeed } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState("kit");

  const [kitItems, setKitItems] = useState(() => shuffleItems());
  const [kitSelected, setKitSelected] = useState({});
  const [kitMistakes, setKitMistakes] = useState(0);
  const [kitTimeLeft, setKitTimeLeft] = useState(KIT_SECONDS);
  const [kitRunning, setKitRunning] = useState(false);
  const [kitDone, setKitDone] = useState(false);
  const [kitBest, setKitBest] = useState(0);

  const [quakeIndex, setQuakeIndex] = useState(0);
  const [quakeHits, setQuakeHits] = useState(0);
  const [quakeMistakes, setQuakeMistakes] = useState(0);
  const [quakeTimeLeft, setQuakeTimeLeft] = useState(QUAKE_SECONDS);
  const [quakeRunning, setQuakeRunning] = useState(false);
  const [quakeDone, setQuakeDone] = useState(false);
  const [quakeBest, setQuakeBest] = useState(0);

  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizPicked, setQuizPicked] = useState(null);
  const [quizDone, setQuizDone] = useState(false);
  const [quizBest, setQuizBest] = useState(0);

  const [aidIndex, setAidIndex] = useState(0);
  const [aidCorrect, setAidCorrect] = useState(0);
  const [aidPicked, setAidPicked] = useState(null);
  const [aidDone, setAidDone] = useState(false);
  const [aidBest, setAidBest] = useState(0);

  const safePicked = useMemo(
    () => KIT_ITEMS.filter((item) => item.safe && kitSelected[item.id]).length,
    [kitSelected]
  );
  const kitScore = Math.max(0, safePicked * 100 - kitMistakes * 25 + kitTimeLeft * 2);
  const quakeScore = Math.max(0, quakeHits * 120 - quakeMistakes * 30 + quakeTimeLeft * 3);
  const quizScore = quizCorrect * 100;
  const aidScore = aidCorrect * 100;
  const kitProgress = (safePicked / TOTAL_SAFE_ITEMS) * 100;
  const quakeProgress = (quakeIndex / QUAKE_PROMPTS.length) * 100;
  const quizProgress = (quizIndex / QUIZ_QUESTIONS.length) * 100;
  const aidProgress = (aidIndex / FIRST_AID_ROUNDS.length) * 100;
  const tileWidth = width < 380 ? "48%" : "31%";
  const currentGame = GAMES.find((game) => game.id === mode) || GAMES[0];
  const currentQuakePrompt = QUAKE_PROMPTS[quakeIndex] || QUAKE_PROMPTS[QUAKE_PROMPTS.length - 1];
  const currentQuiz = QUIZ_QUESTIONS[quizIndex] || QUIZ_QUESTIONS[QUIZ_QUESTIONS.length - 1];
  const currentAid = FIRST_AID_ROUNDS[aidIndex] || FIRST_AID_ROUNDS[FIRST_AID_ROUNDS.length - 1];

  const speak = useCallback((message) => {
    Speech.stop();
    const rate = voiceSpeed === "slow" ? 0.72 : voiceSpeed === "fast" ? 1 : 0.85;
    Speech.speak(message, { language: "en-US", rate, pitch: 1.02 });
  }, [voiceSpeed]);

  const loadBestScores = useCallback(async () => {
    try {
      const [savedKit, savedQuake, savedQuiz, savedAid] = await Promise.all([
        AsyncStorage.getItem(KIT_STORAGE_KEY),
        AsyncStorage.getItem(QUAKE_STORAGE_KEY),
        AsyncStorage.getItem(QUIZ_STORAGE_KEY),
        AsyncStorage.getItem(FIRST_AID_STORAGE_KEY),
      ]);
      if (savedKit) setKitBest(Number(savedKit));
      if (savedQuake) setQuakeBest(Number(savedQuake));
      if (savedQuiz) setQuizBest(Number(savedQuiz));
      if (savedAid) setAidBest(Number(savedAid));
    } catch (error) {
      console.log(error);
    }
  }, []);

  const saveBest = useCallback(async (key, score, currentBest, setBest) => {
    if (score <= currentBest) return;
    setBest(score);
    try {
      await AsyncStorage.setItem(key, String(score));
    } catch (error) {
      console.log(error);
    }
  }, []);

  const finishKitRound = useCallback(async (completed) => {
    setKitRunning(false);
    setKitDone(true);
    await saveBest(KIT_STORAGE_KEY, kitScore, kitBest, setKitBest);
    Haptics.notificationAsync(
      completed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    speak(completed ? "Great job. Your go bag is ready." : "Time is up. Try again and pack the essentials.");
  }, [kitBest, kitScore, saveBest, speak]);

  const finishQuakeRound = useCallback(async (completed) => {
    setQuakeRunning(false);
    setQuakeDone(true);
    await saveBest(QUAKE_STORAGE_KEY, quakeScore, quakeBest, setQuakeBest);
    Haptics.notificationAsync(
      completed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    speak(completed ? "Drill complete. Drop, cover, and hold." : "Time is up. Practice the sequence again.");
  }, [quakeBest, quakeScore, saveBest, speak]);

  useEffect(() => {
    loadBestScores();
    return () => Speech.stop();
  }, [loadBestScores]);

  useEffect(() => {
    if (!kitRunning || kitDone) return undefined;
    if (kitTimeLeft <= 0) {
      finishKitRound(false);
      return undefined;
    }
    const timer = setTimeout(() => setKitTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [finishKitRound, kitDone, kitRunning, kitTimeLeft]);

  useEffect(() => {
    if (safePicked === TOTAL_SAFE_ITEMS && kitRunning && !kitDone) {
      finishKitRound(true);
    }
  }, [finishKitRound, kitDone, kitRunning, safePicked]);

  useEffect(() => {
    if (!quakeRunning || quakeDone) return undefined;
    if (quakeTimeLeft <= 0) {
      finishQuakeRound(false);
      return undefined;
    }
    const timer = setTimeout(() => setQuakeTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [finishQuakeRound, quakeDone, quakeRunning, quakeTimeLeft]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    Speech.stop();
  };

  const startKitRound = () => {
    Haptics.selectionAsync();
    setKitItems(shuffleItems());
    setKitSelected({});
    setKitMistakes(0);
    setKitTimeLeft(KIT_SECONDS);
    setKitDone(false);
    setKitRunning(true);
    speak(GAMES[0].va);
  };

  const resetKitRound = () => {
    setKitItems(shuffleItems());
    setKitSelected({});
    setKitMistakes(0);
    setKitTimeLeft(KIT_SECONDS);
    setKitDone(false);
    setKitRunning(false);
    Speech.stop();
  };

  const pickKitItem = (item) => {
    if (!kitRunning || kitDone || kitSelected[item.id]) return;

    if (item.safe) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setKitSelected((current) => ({ ...current, [item.id]: "safe" }));
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setKitSelected((current) => ({ ...current, [item.id]: "mistake" }));
    setKitMistakes((value) => value + 1);
  };

  const startQuakeRound = () => {
    Haptics.selectionAsync();
    setQuakeIndex(0);
    setQuakeHits(0);
    setQuakeMistakes(0);
    setQuakeTimeLeft(QUAKE_SECONDS);
    setQuakeDone(false);
    setQuakeRunning(true);
    speak(GAMES[1].va);
  };

  const resetQuakeRound = () => {
    setQuakeIndex(0);
    setQuakeHits(0);
    setQuakeMistakes(0);
    setQuakeTimeLeft(QUAKE_SECONDS);
    setQuakeDone(false);
    setQuakeRunning(false);
    Speech.stop();
  };

  const pickQuakeAction = (actionId) => {
    if (!quakeRunning || quakeDone) return;

    if (actionId === currentQuakePrompt.answer) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setQuakeHits((value) => value + 1);
      const nextIndex = quakeIndex + 1;
      if (nextIndex >= QUAKE_PROMPTS.length) {
        setQuakeIndex(nextIndex);
        finishQuakeRound(true);
      } else {
        setQuakeIndex(nextIndex);
      }
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setQuakeMistakes((value) => value + 1);
    speak(currentQuakePrompt.tip);
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setQuizCorrect(0);
    setQuizPicked(null);
    setQuizDone(false);
    speak(GAMES[2].va);
  };

  const pickQuizAnswer = async (index) => {
    if (quizDone || quizPicked !== null) return;
    const correct = index === currentQuiz.answer;
    setQuizPicked(index);
    if (correct) {
      setQuizCorrect((value) => value + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    speak(currentQuiz.reason);

    const nextCorrect = correct ? quizCorrect + 1 : quizCorrect;
    if (quizIndex + 1 >= QUIZ_QUESTIONS.length) {
      const finalScore = nextCorrect * 100;
      setQuizDone(true);
      await saveBest(QUIZ_STORAGE_KEY, finalScore, quizBest, setQuizBest);
    }
  };

  const nextQuiz = () => {
    if (quizIndex + 1 >= QUIZ_QUESTIONS.length) return;
    setQuizIndex((value) => value + 1);
    setQuizPicked(null);
  };

  const resetAid = () => {
    setAidIndex(0);
    setAidCorrect(0);
    setAidPicked(null);
    setAidDone(false);
    speak(GAMES[3].va);
  };

  const pickAidResponse = async (responseId) => {
    if (aidDone || aidPicked !== null) return;
    const correct = responseId === currentAid.answer;
    setAidPicked(responseId);
    if (correct) {
      setAidCorrect((value) => value + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    speak(currentAid.reason);

    const nextCorrect = correct ? aidCorrect + 1 : aidCorrect;
    if (aidIndex + 1 >= FIRST_AID_ROUNDS.length) {
      const finalScore = nextCorrect * 100;
      setAidDone(true);
      await saveBest(FIRST_AID_STORAGE_KEY, finalScore, aidBest, setAidBest);
    }
  };

  const nextAid = () => {
    if (aidIndex + 1 >= FIRST_AID_ROUNDS.length) return;
    setAidIndex((value) => value + 1);
    setAidPicked(null);
  };

  const showVa = () => {
    Haptics.selectionAsync();
    speak(currentGame.va);
  };

  const showHint = () => {
    Alert.alert(currentGame.title, currentGame.intro);
  };

  const renderGame = () => {
    if (mode === "kit") {
      return (
        <>
          <ScoreCard
            card={card}
            border={border}
            textDark={textDark}
            textLight={textLight}
            items={[
              { label: "TIME", value: `${kitTimeLeft}s`, color: kitTimeLeft <= 10 ? COLORS.primary : textDark },
              { label: "PACKED", value: `${safePicked}/${TOTAL_SAFE_ITEMS}` },
              { label: "BEST", value: kitBest, color: COLORS.success },
            ]}
          />
          <ProgressCard
            card={card}
            border={border}
            textDark={textDark}
            textMid={textMid}
            title="Go-bag progress"
            percent={kitProgress}
            helper="Tap the essentials. Wrong picks cost points."
          />
          <ControlRow
            surface={surface}
            border={border}
            running={kitRunning}
            startLabel="Start Game"
            restartLabel="Restart"
            onPrimary={kitRunning ? resetKitRound : startKitRound}
            onHint={showHint}
            onSpeak={showVa}
          />
          {kitDone && (
            <ResultCard
              border={border}
              surface={surface}
              textDark={textDark}
              textMid={textMid}
              complete={safePicked === TOTAL_SAFE_ITEMS}
              title={safePicked === TOTAL_SAFE_ITEMS ? "Go-bag ready!" : "Time is up"}
              score={kitScore}
            />
          )}
          <View style={styles.itemGrid}>
            {kitItems.map((item) => {
              const status = kitSelected[item.id];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemTile,
                    { width: tileWidth, backgroundColor: card, borderColor: border },
                    status === "safe" && styles.correctTile,
                    status === "mistake" && styles.wrongTile,
                  ]}
                  onPress={() => pickKitItem(item)}
                  activeOpacity={0.84}
                >
                  <View
                    style={[
                      styles.itemIcon,
                      { backgroundColor: status === "safe" ? "#E8F5E9" : status === "mistake" ? "#FFEBEE" : surface },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={25}
                      color={status === "safe" ? COLORS.success : status === "mistake" ? COLORS.primary : textMid}
                    />
                  </View>
                  <Text style={[styles.itemName, { color: textDark }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {status && (
                    <Ionicons
                      name={status === "safe" ? "checkmark-circle" : "close-circle"}
                      size={18}
                      color={status === "safe" ? COLORS.success : COLORS.primary}
                      style={styles.statusIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      );
    }

    if (mode === "quake") {
      return (
        <>
          <ScoreCard
            card={card}
            border={border}
            textDark={textDark}
            textLight={textLight}
            items={[
              { label: "TIME", value: `${quakeTimeLeft}s`, color: quakeTimeLeft <= 10 ? COLORS.primary : textDark },
              { label: "CORRECT", value: `${quakeHits}/${QUAKE_PROMPTS.length}` },
              { label: "BEST", value: quakeBest, color: COLORS.success },
            ]}
          />
          <View style={[styles.gameCard, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: textDark }]}>Drop, Cover, Hold</Text>
              <Text style={[styles.progressPercent, { color: COLORS.primary }]}>{Math.round(quakeProgress)}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: border }]}>
              <View style={[styles.progressFill, { width: `${quakeProgress}%` }]} />
            </View>
            <View style={[styles.promptBox, { backgroundColor: surface }]}>
              <MaterialCommunityIcons name="earth" size={32} color={COLORS.primary} />
              <Text style={[styles.promptText, { color: textDark }]}>
                {quakeRunning ? currentQuakePrompt.prompt : "Start the drill, then tap the safest action."}
              </Text>
            </View>
          </View>
          <ControlRow
            surface={surface}
            border={border}
            running={quakeRunning}
            startLabel="Start Drill"
            restartLabel="Restart"
            onPrimary={quakeRunning ? resetQuakeRound : startQuakeRound}
            onHint={showHint}
            onSpeak={showVa}
          />
          {quakeDone && (
            <ResultCard
              border={border}
              surface={surface}
              textDark={textDark}
              textMid={textMid}
              complete={quakeHits === QUAKE_PROMPTS.length}
              title={quakeHits === QUAKE_PROMPTS.length ? "Drill complete!" : "Time is up"}
              score={quakeScore}
            />
          )}
          <View style={styles.actionGrid}>
            {QUAKE_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionButton, { backgroundColor: card, borderColor: action.color }]}
                onPress={() => pickQuakeAction(action.id)}
                activeOpacity={0.84}
              >
                <MaterialCommunityIcons name={action.icon} size={34} color={action.color} />
                <Text style={[styles.actionText, { color: textDark }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      );
    }

    if (mode === "quiz") {
      const answered = quizPicked !== null;
      return (
        <>
          <ScoreCard
            card={card}
            border={border}
            textDark={textDark}
            textLight={textLight}
            items={[
              { label: "QUESTION", value: `${Math.min(quizIndex + 1, QUIZ_QUESTIONS.length)}/${QUIZ_QUESTIONS.length}` },
              { label: "SCORE", value: quizScore },
              { label: "BEST", value: quizBest, color: COLORS.success },
            ]}
          />
          <View style={[styles.gameCard, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: textDark }]}>Disaster Quiz</Text>
              <Text style={[styles.progressPercent, { color: COLORS.primary }]}>{Math.round(quizProgress)}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: border }]}>
              <View style={[styles.progressFill, { width: `${quizProgress}%` }]} />
            </View>
            <Text style={[styles.questionText, { color: textDark }]}>{currentQuiz.question}</Text>
            <View style={styles.optionList}>
              {currentQuiz.options.map((option, index) => {
                const isCorrect = index === currentQuiz.answer;
                const selected = quizPicked === index;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      { backgroundColor: surface, borderColor: border },
                      answered && isCorrect && styles.correctOption,
                      selected && !isCorrect && styles.wrongOption,
                    ]}
                    onPress={() => pickQuizAnswer(index)}
                  >
                    <Text style={[styles.optionText, { color: textDark }]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {answered && (
              <Text style={[styles.reasonText, { color: textMid }]}>{currentQuiz.reason}</Text>
            )}
          </View>
          <RoundControls
            surface={surface}
            border={border}
            done={quizDone}
            answered={answered}
            onReset={resetQuiz}
            onNext={nextQuiz}
            onHint={showHint}
            onSpeak={showVa}
          />
          {quizDone && (
            <ResultCard
              border={border}
              surface={surface}
              textDark={textDark}
              textMid={textMid}
              complete={quizCorrect === QUIZ_QUESTIONS.length}
              title="Quiz complete!"
              score={quizCorrect * 100}
            />
          )}
        </>
      );
    }

    const aidAnswered = aidPicked !== null;
    return (
      <>
        <ScoreCard
          card={card}
          border={border}
          textDark={textDark}
          textLight={textLight}
          items={[
            { label: "ROUND", value: `${Math.min(aidIndex + 1, FIRST_AID_ROUNDS.length)}/${FIRST_AID_ROUNDS.length}` },
            { label: "SCORE", value: aidScore },
            { label: "BEST", value: aidBest, color: COLORS.success },
          ]}
        />
        <View style={[styles.gameCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: textDark }]}>First Aid Match</Text>
            <Text style={[styles.progressPercent, { color: COLORS.primary }]}>{Math.round(aidProgress)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: border }]}>
            <View style={[styles.progressFill, { width: `${aidProgress}%` }]} />
          </View>
          <View style={[styles.firstAidPrompt, { backgroundColor: surface }]}>
            <MaterialCommunityIcons name={currentAid.icon} size={36} color={COLORS.primary} />
            <Text style={[styles.promptText, { color: textDark }]}>{currentAid.emergency}</Text>
          </View>
          <View style={styles.optionList}>
            {currentAid.responses.map((response) => {
              const isCorrect = response.id === currentAid.answer;
              const selected = aidPicked === response.id;
              return (
                <TouchableOpacity
                  key={response.id}
                  style={[
                    styles.optionButton,
                    { backgroundColor: surface, borderColor: border },
                    aidAnswered && isCorrect && styles.correctOption,
                    selected && !isCorrect && styles.wrongOption,
                  ]}
                  onPress={() => pickAidResponse(response.id)}
                >
                  <MaterialCommunityIcons name={response.icon} size={21} color={COLORS.primary} />
                  <Text style={[styles.optionText, { color: textDark }]}>{response.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {aidAnswered && (
            <Text style={[styles.reasonText, { color: textMid }]}>{currentAid.reason}</Text>
          )}
        </View>
        <RoundControls
          surface={surface}
          border={border}
          done={aidDone}
          answered={aidAnswered}
          onReset={resetAid}
          onNext={nextAid}
          onHint={showHint}
          onSpeak={showVa}
        />
        {aidDone && (
          <ResultCard
            border={border}
            surface={surface}
            textDark={textDark}
            textMid={textMid}
            complete={aidCorrect === FIRST_AID_ROUNDS.length}
            title="First aid round complete!"
            score={aidCorrect * 100}
          />
        )}
      </>
    );
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="gamepad-variant" size={28} color="#fff" />
          <Text style={styles.title}>Safety Games</Text>
        </View>
        <Text style={styles.subtitle}>Practice emergency skills with quick mini-games.</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Choose Game"
          subtitle="Simple safety drills"
          textDark={textDark}
          textLight={textLight}
        />
        <View style={styles.gameGrid}>
          {GAMES.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={[
                styles.gameTile,
                { backgroundColor: card, borderColor: mode === game.id ? COLORS.primary : border },
                mode === game.id && styles.activeGameTile,
              ]}
              onPress={() => switchMode(game.id)}
            >
              <View style={[styles.gameTileIcon, { backgroundColor: mode === game.id ? COLORS.primary + "14" : surface }]}>
                <MaterialCommunityIcons name={game.icon} size={24} color={mode === game.id ? COLORS.primary : textMid} />
              </View>
              <Text style={[styles.gameTileText, { color: textDark }]} numberOfLines={1}>{game.title}</Text>
              <Text style={[styles.gameType, { color: mode === game.id ? COLORS.primary : textLight }]}>{game.type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader
          title={currentGame.title}
          subtitle={currentGame.type}
          textDark={textDark}
          textLight={textLight}
        />
        <Text style={[styles.gameIntroLine, { color: textMid }]}>{currentGame.intro}</Text>

        {renderGame()}

        <View style={{ height: 36 }} />
      </ScrollView>
    </View>
  );
}

function ScoreCard({ card, border, textDark, textLight, items }) {
  return (
    <View style={[styles.scoreCard, { backgroundColor: card, borderColor: border }]}>
      {items.map((item) => (
        <View key={item.label} style={styles.scoreItem}>
          <Text style={[styles.scoreLabel, { color: textLight }]}>{item.label}</Text>
          <Text style={[styles.scoreValue, { color: item.color || textDark }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionHeader({ title, subtitle, textDark, textLight }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: textDark }]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, { color: textLight }]}>{subtitle}</Text>
    </View>
  );
}

function ProgressCard({ card, border, textDark, textMid, title, percent, helper }) {
  return (
    <View style={[styles.gameCard, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressTitle, { color: textDark }]}>{title}</Text>
        <Text style={[styles.progressPercent, { color: COLORS.primary }]}>{Math.round(percent)}%</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: border }]}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <Text style={[styles.helperText, { color: textMid }]}>{helper}</Text>
    </View>
  );
}

function ControlRow({ surface, border, running, startLabel, restartLabel, onPrimary, onHint, onSpeak }) {
  return (
    <View style={styles.controls}>
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: running ? COLORS.primaryDark : COLORS.primary }]}
        onPress={onPrimary}
        activeOpacity={0.85}
      >
        <Ionicons name={running ? "refresh" : "play"} size={18} color="#fff" />
        <Text style={styles.primaryButtonText}>{running ? restartLabel : startLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.iconButton, { backgroundColor: surface, borderColor: border }]} onPress={onHint}>
        <Ionicons name="bulb" size={20} color={COLORS.warning} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.iconButton, { backgroundColor: surface, borderColor: border }]} onPress={onSpeak}>
        <Ionicons name="volume-high" size={20} color={COLORS.info} />
      </TouchableOpacity>
    </View>
  );
}

function RoundControls({ surface, border, done, answered, onReset, onNext, onHint, onSpeak }) {
  return (
    <View style={styles.controls}>
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: done || !answered ? COLORS.primary : COLORS.success }]}
        onPress={done || !answered ? onReset : onNext}
        activeOpacity={0.85}
      >
        <Ionicons name={done || !answered ? "refresh" : "arrow-forward"} size={18} color="#fff" />
        <Text style={styles.primaryButtonText}>{done ? "Play Again" : answered ? "Next" : "Restart"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.iconButton, { backgroundColor: surface, borderColor: border }]} onPress={onHint}>
        <Ionicons name="bulb" size={20} color={COLORS.warning} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.iconButton, { backgroundColor: surface, borderColor: border }]} onPress={onSpeak}>
        <Ionicons name="volume-high" size={20} color={COLORS.info} />
      </TouchableOpacity>
    </View>
  );
}

function ResultCard({ border, surface, textDark, textMid, complete, title, score }) {
  return (
    <View style={[styles.resultCard, { backgroundColor: surface, borderColor: border }]}>
      <MaterialCommunityIcons
        name={complete ? "trophy" : "timer-alert"}
        size={34}
        color={complete ? COLORS.success : COLORS.warning}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.resultTitle, { color: textDark }]}>{title}</Text>
        <Text style={[styles.resultText, { color: textMid }]}>Score: {score} points</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  backButton: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14, alignSelf: "flex-start" },
  backText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: "#fff", fontSize: 30, fontWeight: "bold" },
  subtitle: { color: "rgba(255,255,255,0.78)", fontSize: 13, marginTop: 5 },
  container: { flex: 1, padding: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    marginTop: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  sectionSubtitle: { fontSize: 12, flexShrink: 1, textAlign: "right" },
  gameGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  gameTile: {
    width: "48%",
    minHeight: 104,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  activeGameTile: { borderWidth: 1.5 },
  gameTileIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  gameTileText: { fontSize: 13, fontWeight: "bold", textAlign: "center" },
  gameType: { fontSize: 10, fontWeight: "800" },
  gameIntroLine: { fontSize: 12, lineHeight: 18, marginTop: -4, marginBottom: 12 },
  gameTileIntro: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  gameBestText: { fontSize: 10, fontWeight: "700", marginTop: 5 },
  selectedGameBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 12,
  },
  selectedGameIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  selectedGameTitle: { fontSize: 15, fontWeight: "bold" },
  selectedGameIntro: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  vaCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 14,
  },
  vaIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  vaTextBlock: { flex: 1 },
  vaTitle: { fontSize: 14, fontWeight: "bold" },
  vaText: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  vaButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  askCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    marginBottom: 14,
  },
  askTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 7 },
  askAnswer: { fontSize: 12, lineHeight: 18, marginBottom: 11 },
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
  scoreCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scoreItem: { alignItems: "center", flex: 1 },
  scoreLabel: { fontSize: 10, fontWeight: "800", marginBottom: 3 },
  scoreValue: { fontSize: 22, fontWeight: "bold" },
  gameCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 12 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 9 },
  progressTitle: { fontSize: 15, fontWeight: "bold" },
  progressPercent: { fontSize: 15, fontWeight: "bold" },
  progressTrack: { height: 9, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: 9, borderRadius: 5, backgroundColor: COLORS.primary },
  helperText: { fontSize: 12, marginTop: 9 },
  promptBox: { minHeight: 128, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 18, marginTop: 14 },
  promptText: { textAlign: "center", fontSize: 20, fontWeight: "bold", lineHeight: 26, marginTop: 10 },
  firstAidPrompt: { minHeight: 112, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 18, marginTop: 14 },
  questionText: { fontSize: 19, lineHeight: 25, fontWeight: "bold", marginTop: 14 },
  optionList: { gap: 9, marginTop: 14 },
  optionButton: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  optionText: { flex: 1, fontSize: 14, fontWeight: "700", lineHeight: 19 },
  correctOption: { borderColor: COLORS.success, backgroundColor: "#E8F5E9" },
  wrongOption: { borderColor: COLORS.primary, backgroundColor: "#FFEBEE" },
  reasonText: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  controls: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 14, marginBottom: 14 },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  resultTitle: { fontSize: 16, fontWeight: "bold" },
  resultText: { fontSize: 12, marginTop: 2 },
  itemGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  itemTile: {
    minHeight: 124,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  correctTile: { borderColor: COLORS.success, borderWidth: 1.5 },
  wrongTile: { borderColor: COLORS.primary, borderWidth: 1.5, opacity: 0.72 },
  itemIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  itemName: { fontSize: 12, lineHeight: 16, textAlign: "center", fontWeight: "700" },
  statusIcon: { position: "absolute", top: 8, right: 8 },
  actionGrid: { gap: 10 },
  actionButton: {
    minHeight: 82,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  actionText: { fontSize: 20, fontWeight: "bold" },
});
