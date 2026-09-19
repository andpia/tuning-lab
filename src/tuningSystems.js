const createEqualTemperamentRatios = () => {
  const ratios = {}

  for (let semitone = 0; semitone <= 12; semitone += 1) {
    const octave = semitone === 12 ? 5 : 4
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const noteName = semitone === 12 ? 'C' : noteNames[semitone]
    const noteId = `${noteName}${octave}`
    ratios[noteId] = {
      value: Number(2 ** (semitone / 12)).toFixed(6),
      label: semitone === 0 ? '1/1' : `2^(${semitone}/12)`,
    }
  }

  return ratios
}

export const KEYBOARD_LAYOUT = [
  { id: 'C4', label: 'C', color: 'white', semitone: 0, whiteIndex: 0 },
  { id: 'C#4', label: 'C♯', color: 'black', semitone: 1, leftOffset: 0.67 },
  { id: 'D4', label: 'D', color: 'white', semitone: 2, whiteIndex: 1 },
  { id: 'D#4', label: 'D♯', color: 'black', semitone: 3, leftOffset: 1.67 },
  { id: 'E4', label: 'E', color: 'white', semitone: 4, whiteIndex: 2 },
  { id: 'F4', label: 'F', color: 'white', semitone: 5, whiteIndex: 3 },
  { id: 'F#4', label: 'F♯', color: 'black', semitone: 6, leftOffset: 3.67 },
  { id: 'G4', label: 'G', color: 'white', semitone: 7, whiteIndex: 4 },
  { id: 'G#4', label: 'G♯', color: 'black', semitone: 8, leftOffset: 4.67 },
  { id: 'A4', label: 'A', color: 'white', semitone: 9, whiteIndex: 5 },
  { id: 'A#4', label: 'A♯', color: 'black', semitone: 10, leftOffset: 5.67 },
  { id: 'B4', label: 'B', color: 'white', semitone: 11, whiteIndex: 6 },
  { id: 'C5', label: 'C', color: 'white', semitone: 12, whiteIndex: 7 },
]

export const TUNING_PRESETS = {
  pythagorean: {
    id: 'pythagorean',
    name: 'Pitagorico',
    description:
      'Intonazione costruita per quinte pure, con differenze molto evidenti rispetto al temperamento equabile.',
    tonic: 'C4',
    tonicFrequency: 261.63,
    ratios: {
      C4: { value: 1, label: '1/1' },
      'C#4': { value: 2187 / 2048, label: '2187/2048' },
      D4: { value: 9 / 8, label: '9/8' },
      'D#4': { value: 32 / 27, label: '32/27' },
      E4: { value: 81 / 64, label: '81/64' },
      F4: { value: 4 / 3, label: '4/3' },
      'F#4': { value: 729 / 512, label: '729/512' },
      G4: { value: 3 / 2, label: '3/2' },
      'G#4': { value: 6561 / 4096, label: '6561/4096' },
      A4: { value: 27 / 16, label: '27/16' },
      'A#4': { value: 16 / 9, label: '16/9' },
      B4: { value: 243 / 128, label: '243/128' },
      C5: { value: 2, label: '2/1' },
    },
  },
  equalTemperament: {
    id: 'equalTemperament',
    name: 'Temperamento equabile',
    description:
      'Divisione dell’ottava in 12 semitoni uguali, utile come riferimento moderno per confrontare il sistema pitagorico.',
    tonic: 'C4',
    tonicFrequency: 261.63,
    ratios: createEqualTemperamentRatios(),
  },
}

export const SCALE_PRESETS = {
  major: {
    id: 'major',
    name: 'Scala maggiore di Do',
    steps: [0, 2, 4, 5, 7, 9, 11, 12],
  },
  pentatonic: {
    id: 'pentatonic',
    name: 'Pentatonica maggiore',
    steps: [0, 2, 4, 7, 9, 12],
  },
  chromatic: {
    id: 'chromatic',
    name: 'Cromatica',
    steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
}

export const getPresetById = (presetId) => TUNING_PRESETS[presetId]

export const getScaleById = (scaleId) => SCALE_PRESETS[scaleId]

export const buildNotesFromPreset = (preset) =>
  KEYBOARD_LAYOUT.map((key) => {
    const ratioDefinition = preset.ratios[key.id]
    const ratioValue = Number(ratioDefinition.value)
    const frequency = Number((preset.tonicFrequency * ratioValue).toFixed(2))

    return {
      ...key,
      presetRatioLabel: ratioDefinition.label,
      presetRatioValue: ratioValue,
      frequency,
      originalFrequency: frequency,
    }
  })

export const formatRatio = (ratio) => Number(ratio).toFixed(4)
