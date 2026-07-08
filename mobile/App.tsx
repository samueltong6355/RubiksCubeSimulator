import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CubeView } from './src/components/CubeView';
import { analyzeBlind, BlindResult, ExecutionStep } from './src/core/blind';
import { applySequence, Move, parseMoves, SOLVED_STATE, validateState } from './src/core/cube';
import { solveFallback, solveKociemba } from './src/core/solver';

const FACE_COLORS: Record<string, string> = {
  U: '#FFFFFF',
  R: '#E83030',
  F: '#30B030',
  D: '#F0D000',
  L: '#F07800',
  B: '#3070F0',
};

const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
const MODES = ['Old Pochmann', 'M2', '3-Cycle', 'Optimal Solver'] as const;
const TOOLS = ['brush', 'fill'] as const;

type Mode = (typeof MODES)[number];
type PaintTool = (typeof TOOLS)[number];

type Output =
  | { type: 'blind'; result: BlindResult }
  | { type: 'solution'; moves: Move[]; source: string }
  | { type: 'message'; title: string; body: string };

export default function App() {
  const [cubeState, setCubeState] = useState(SOLVED_STATE);
  const [paintColor, setPaintColor] = useState('U');
  const [tool, setTool] = useState<PaintTool>('brush');
  const [mode, setMode] = useState<Mode>('Old Pochmann');
  const [scramble, setScramble] = useState('');
  const [output, setOutput] = useState<Output>({ type: 'message', title: 'Ready', body: 'Solved state loaded.' });
  const [busy, setBusy] = useState(false);

  const counts = useMemo(
    () => FACE_NAMES.map((face) => ({ face, count: cubeState.split('').filter((value) => value === face).length })),
    [cubeState],
  );

  const setMessage = (title: string, body: string) => setOutput({ type: 'message', title, body });

  const applyScramble = () => {
    try {
      const moves = parseMoves(scramble);
      setCubeState(applySequence(SOLVED_STATE, moves));
      setMessage('Scramble Applied', moves.length ? moves.join(' ') : 'Solved state loaded.');
    } catch (error) {
      setMessage('Invalid Scramble', error instanceof Error ? error.message : String(error));
    }
  };

  const validate = () => {
    const result = validateState(cubeState, true);
    setMessage(result.ok ? 'Valid Cube' : 'Invalid Cube', result.ok ? 'This state is physically reachable.' : result.reason);
  };

  const solve = () => {
    const validation = validateState(cubeState, true);
    if (!validation.ok) {
      setMessage('Invalid Cube', validation.reason);
      return;
    }

    setBusy(true);
    setMessage('Solving', mode === 'Optimal Solver' ? 'Initializing solver tables.' : 'Tracing memo and execution.');

    setTimeout(() => {
      try {
        if (mode === 'Optimal Solver') {
          let moves: Move[];
          let source = 'Kociemba two-phase';
          try {
            moves = solveKociemba(cubeState);
          } catch {
            const fallback = solveFallback(cubeState, 12, 3500);
            if (!fallback) throw new Error('Solver could not finish this state.');
            moves = fallback;
            source = 'shallow IDA fallback';
          }
          setOutput({ type: 'solution', moves, source });
          return;
        }
        setOutput({ type: 'blind', result: analyzeBlind(cubeState, mode) });
      } catch (error) {
        setMessage('Solve Error', error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    }, 40);
  };

  const reset = () => {
    setCubeState(SOLVED_STATE);
    setScramble('');
    setMessage('Reset', 'Solved state loaded.');
  };

  const applyDisplayedSolution = () => {
    if (output.type !== 'solution') return;
    setCubeState(applySequence(cubeState, output.moves));
    setMessage('Solution Applied', output.moves.length ? output.moves.join(' ') : 'Cube was already solved.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Rubik's BLD Trainer</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{busy ? 'Working' : cubeState === SOLVED_STATE ? 'Solved' : 'Edited'}</Text>
            </View>
          </View>

          <CubeView
            state={cubeState}
            paintColor={paintColor}
            tool={tool}
            showSpeffz={mode !== 'Optimal Solver'}
            onChange={setCubeState}
          />

          <Panel>
            <SegmentedControl
              values={MODES}
              value={mode}
              onChange={(next) => setMode(next as Mode)}
            />
          </Panel>

          <Panel>
            <View style={styles.toolRow}>
              {TOOLS.map((value) => (
                <Chip key={value} selected={tool === value} onPress={() => setTool(value)}>
                  {value === 'brush' ? 'Brush' : 'Fill Face'}
                </Chip>
              ))}
            </View>
            <View style={styles.swatchRow}>
              {FACE_NAMES.map((face) => (
                <Pressable
                  key={face}
                  accessibilityRole="button"
                  onPress={() => setPaintColor(face)}
                  style={[
                    styles.swatch,
                    { backgroundColor: FACE_COLORS[face] },
                    paintColor === face && styles.swatchSelected,
                  ]}
                >
                  <Text style={[styles.swatchText, face === 'U' || face === 'D' || face === 'L' ? styles.swatchDarkText : null]}>
                    {face}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.countRow}>
              {counts.map(({ face, count }) => (
                <Text key={face} style={[styles.countText, count === 9 ? styles.countOk : styles.countBad]}>
                  {face}:{count}
                </Text>
              ))}
            </View>
          </Panel>

          <Panel>
            <TextInput
              value={scramble}
              onChangeText={setScramble}
              placeholder="R U R' U'"
              placeholderTextColor="#7f849c"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
            />
            <View style={styles.actionGrid}>
              <ActionButton label="Scramble" onPress={applyScramble} />
              <ActionButton label="Validate" onPress={validate} />
              <ActionButton label={busy ? 'Solving' : 'Solve'} onPress={solve} disabled={busy} primary />
              <ActionButton label="Reset" onPress={reset} />
            </View>
          </Panel>

          <OutputPanel output={output} onApplySolution={applyDisplayedSolution} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

function SegmentedControl<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {values.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          onPress={() => onChange(item)}
          style={[styles.segment, value === item && styles.segmentSelected]}
        >
          <Text style={[styles.segmentText, value === item && styles.segmentTextSelected]}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Chip({ children, selected, onPress }: { children: React.ReactNode; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{children}</Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  primary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionButton, primary && styles.actionPrimary, disabled && styles.actionDisabled]}
    >
      <Text style={[styles.actionText, primary && styles.actionPrimaryText]}>{label}</Text>
    </Pressable>
  );
}

function OutputPanel({ output, onApplySolution }: { output: Output; onApplySolution: () => void }) {
  if (output.type === 'message') {
    return (
      <Panel>
        <Text style={styles.outputTitle}>{output.title}</Text>
        <Text style={styles.outputBody}>{output.body}</Text>
      </Panel>
    );
  }

  if (output.type === 'solution') {
    return (
      <Panel>
        <View style={styles.outputHeader}>
          <Text style={styles.outputTitle}>Solution</Text>
          <Text style={styles.outputMeta}>{output.source}</Text>
        </View>
        <Text style={styles.solutionText}>{output.moves.length ? output.moves.join(' ') : '(already solved)'}</Text>
        <ActionButton label="Apply Solution" onPress={onApplySolution} primary />
      </Panel>
    );
  }

  return <BlindOutput result={output.result} />;
}

function BlindOutput({ result }: { result: BlindResult }) {
  return (
    <Panel>
      <View style={styles.outputHeader}>
        <Text style={styles.outputTitle}>{result.mode}</Text>
        <Text style={styles.outputMeta}>Parity: {result.parityNote}</Text>
      </View>

      <MemoBlock title="Edges" buffer={result.edgeBuffer} letters={result.edges.text} pairs={result.edges.pairs} />
      <ExecutionBlock title="Edge Execution" steps={result.edgeSteps} />
      {result.parityPosition === 'between_edges_and_corners' && result.parityAlgorithm ? (
        <ParityBlock algorithm={result.parityAlgorithm} />
      ) : null}
      <MemoBlock title="Corners" buffer={result.cornerBuffer} letters={result.corners.text} pairs={result.corners.pairs} />
      <ExecutionBlock title="Corner Execution" steps={result.cornerSteps} />
      {result.parityPosition === 'after_corners' && result.parityAlgorithm ? <ParityBlock algorithm={result.parityAlgorithm} /> : null}

      {result.notes.map((note) => (
        <Text key={note} style={styles.noteText}>
          {note}
        </Text>
      ))}
    </Panel>
  );
}

function MemoBlock({ title, buffer, letters, pairs }: { title: string; buffer: string; letters: string; pairs: string[] }) {
  return (
    <View style={styles.memoBlock}>
      <View style={styles.memoHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.outputMeta}>{buffer}</Text>
      </View>
      <Text style={styles.memoLetters}>{letters || '(none)'}</Text>
      <Text style={styles.outputBody}>{pairs.length ? pairs.join(' ') : '(none)'}</Text>
    </View>
  );
}

function ExecutionBlock({ title, steps }: { title: string; steps: ExecutionStep[] }) {
  return (
    <View style={styles.executionBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {steps.length ? steps.map((step, idx) => <ExecutionLine key={`${step.label}-${idx}`} step={step} index={idx + 1} />) : (
        <Text style={styles.outputBody}>(none)</Text>
      )}
    </View>
  );
}

function ExecutionLine({ step, index }: { step: ExecutionStep; index: number }) {
  return (
    <View style={styles.stepLine}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepLabel}>{index}. {step.label}</Text>
        <Text style={styles.stepNote}>{step.note}</Text>
      </View>
      <View style={styles.algorithmLine}>
        {step.setup ? <Text style={styles.setupText}>{step.setup} </Text> : null}
        <Text style={styles.coreText}>{step.core || step.algorithm}</Text>
        {step.undo ? <Text style={styles.undoText}> {step.undo}</Text> : null}
      </View>
    </View>
  );
}

function ParityBlock({ algorithm }: { algorithm: string }) {
  return (
    <View style={styles.parityBlock}>
      <Text style={styles.sectionTitle}>Parity</Text>
      <Text style={styles.parityText}>{algorithm}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101014',
  },
  keyboard: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#f4f4f5',
    fontSize: 24,
    fontWeight: '800',
  },
  statusPill: {
    backgroundColor: '#27272a',
    borderColor: '#3f3f46',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '700',
  },
  panel: {
    alignSelf: 'stretch',
    backgroundColor: '#18181b',
    borderColor: '#2f3037',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  segmented: {
    backgroundColor: '#25262d',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 8,
  },
  segmentSelected: {
    backgroundColor: '#f4f4f5',
  },
  segmentText: {
    color: '#c4c4cc',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  segmentTextSelected: {
    color: '#18181b',
  },
  toolRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#25262d',
    borderColor: '#3f3f46',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chipSelected: {
    backgroundColor: '#0ea5e9',
    borderColor: '#7dd3fc',
  },
  chipText: {
    color: '#d4d4d8',
    fontSize: 14,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: '#031824',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  swatch: {
    alignItems: 'center',
    borderColor: '#2f3037',
    borderRadius: 8,
    borderWidth: 2,
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  swatchSelected: {
    borderColor: '#f4f4f5',
    transform: [{ translateY: -2 }],
  },
  swatchText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  swatchDarkText: {
    color: '#111111',
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
  },
  countOk: {
    color: '#86efac',
  },
  countBad: {
    color: '#fca5a5',
  },
  input: {
    backgroundColor: '#101014',
    borderColor: '#353640',
    borderRadius: 8,
    borderWidth: 1,
    color: '#f4f4f5',
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#25262d',
    borderColor: '#3f3f46',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 42,
    minWidth: '46%',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionPrimary: {
    backgroundColor: '#22c55e',
    borderColor: '#86efac',
  },
  actionDisabled: {
    opacity: 0.55,
  },
  actionText: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '800',
  },
  actionPrimaryText: {
    color: '#06260f',
  },
  outputHeader: {
    gap: 4,
  },
  outputTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: '900',
  },
  outputMeta: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
  },
  outputBody: {
    color: '#d4d4d8',
    fontSize: 14,
    lineHeight: 20,
  },
  solutionText: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
  },
  memoBlock: {
    borderTopColor: '#2f3037',
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 12,
  },
  memoHeader: {
    gap: 2,
  },
  sectionTitle: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '900',
  },
  memoLetters: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  executionBlock: {
    gap: 8,
  },
  stepLine: {
    backgroundColor: '#101014',
    borderColor: '#2f3037',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 10,
  },
  stepHeader: {
    gap: 2,
  },
  stepLabel: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '900',
  },
  stepNote: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  algorithmLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  setupText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
  },
  coreText: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
  },
  undoText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
  },
  parityBlock: {
    backgroundColor: '#2a141b',
    borderColor: '#fb7185',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 10,
  },
  parityText: {
    color: '#fecdd3',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 21,
  },
  noteText: {
    color: '#a1a1aa',
    fontSize: 12,
    lineHeight: 18,
  },
});
