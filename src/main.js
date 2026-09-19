import './style.css'
import { AudioEngine } from './audioEngine'
import {
  buildNotesFromPreset,
  formatRatio,
  getPresetById,
  getScaleById,
  KEYBOARD_LAYOUT,
  SCALE_PRESETS,
  TUNING_PRESETS,
} from './tuningSystems'

const app = document.querySelector('#app')
const presetOptions = Object.values(TUNING_PRESETS)
const scaleOptions = Object.values(SCALE_PRESETS)

const state = {
  selectedPresetId: presetOptions[0].id,
  selectedScaleId: scaleOptions[0].id,
  notes: buildNotesFromPreset(presetOptions[0]),
  activeNoteIds: new Set(),
  isPlaying: false,
  status: 'Pronto per ascoltare e modificare il sistema pitagorico.',
}

const audioEngine = new AudioEngine({
  onNoteStateChange(noteId, isActive) {
    if (isActive) {
      state.activeNoteIds.add(noteId)
    } else {
      state.activeNoteIds.delete(noteId)
    }

    updateDynamicUi()
  },
  onPlaybackStateChange(isPlaying) {
    state.isPlaying = isPlaying
    updateDynamicUi()
  },
})

const findNoteById = (noteId) => state.notes.find((note) => note.id === noteId)
const tonicNote = () => state.notes[0]
const currentPreset = () => getPresetById(state.selectedPresetId)
const currentScale = () => getScaleById(state.selectedScaleId)
const ratioFromTonic = (frequency) => frequency / tonicNote().frequency
const formatFrequency = (frequency) => Number(frequency).toFixed(2)

const getScaleNotes = () => {
  const allowedSteps = new Set(currentScale().steps)
  return state.notes.filter((note) => allowedSteps.has(note.semitone))
}

const getTriadNotes = () => {
  const scaleNotes = getScaleNotes()
  return [scaleNotes[0], scaleNotes[2], scaleNotes[4]].filter(Boolean)
}

const setStatus = (message) => {
  state.status = message
  const statusNode = document.querySelector('[data-role="status"]')
  if (statusNode) {
    statusNode.textContent = message
  }

  const stateLabel = document.querySelector('[data-role="playback-label"]')
  if (stateLabel) {
    stateLabel.textContent = state.isPlaying ? 'Riproduzione in corso' : 'In attesa'
  }
}

const resetPreset = () => {
  state.notes = buildNotesFromPreset(currentPreset())
  setStatus(`Preset ${currentPreset().name} ripristinato.`)
  renderApp()
}

const selectPreset = (presetId) => {
  audioEngine.stopAll()
  state.selectedPresetId = presetId
  state.notes = buildNotesFromPreset(getPresetById(presetId))
  setStatus(`Preset attivo: ${getPresetById(presetId).name}.`)
  renderApp()
}

const updateFrequency = (noteId, nextFrequency) => {
  state.notes = state.notes.map((note) =>
    note.id === noteId ? { ...note, frequency: Number(nextFrequency.toFixed(2)) } : note,
  )
  setStatus(`Frequenza aggiornata per ${noteId}: ${nextFrequency.toFixed(2)} Hz.`)
  renderApp()
}

const keyboardMarkup = () => {
  const whiteKeys = KEYBOARD_LAYOUT.filter((note) => note.color === 'white')
  const blackKeys = KEYBOARD_LAYOUT.filter((note) => note.color === 'black')

  return `
    <div class="keyboard-shell">
      <div class="keyboard keyboard--white">
        ${whiteKeys
          .map((note) => {
            const isActive = state.activeNoteIds.has(note.id)
            return `
              <button
                class="key key--white ${isActive ? 'is-active' : ''}"
                data-action="play-note"
                data-keyboard-key="true"
                data-note-id="${note.id}"
                type="button"
              >
                <span>${note.label}</span>
                <small>${formatFrequency(findNoteById(note.id).frequency)} Hz</small>
              </button>
            `
          })
          .join('')}
      </div>
      <div class="keyboard keyboard--black">
        ${blackKeys
          .map((note) => {
            const isActive = state.activeNoteIds.has(note.id)
            return `
              <button
                class="key key--black ${isActive ? 'is-active' : ''}"
                data-action="play-note"
                data-keyboard-key="true"
                data-note-id="${note.id}"
                type="button"
                style="left: calc(${note.leftOffset} * var(--white-key-width));"
              >
                <span>${note.label}</span>
              </button>
            `
          })
          .join('')}
      </div>
    </div>
  `
}

const scaleMarkup = () => {
  const notes = getScaleNotes()

  return `
    <div class="scale-card">
      <div>
        <p class="eyebrow">Scala selezionata</p>
        <h3>${currentScale().name}</h3>
        <p>${notes.map((note) => note.label).join(' · ')}</p>
      </div>
      <div class="scale-actions">
        <button type="button" class="secondary" data-action="play-scale">Riproduci scala</button>
        <button type="button" class="secondary" data-action="play-scale-desc">Riproduci al contrario</button>
        <button type="button" class="secondary" data-action="play-chord">Accordo semplice</button>
      </div>
    </div>
  `
}

const noteTableMarkup = () => `
  <div class="note-table-wrapper">
    <table class="note-table">
      <thead>
        <tr>
          <th>Nota</th>
          <th>Rapporto preset</th>
          <th>Rapporto corrente</th>
          <th>Frequenza (Hz)</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${state.notes
          .map(
            (note) => `
              <tr>
                <th scope="row">${note.id}</th>
                <td>${note.presetRatioLabel}</td>
                <td>${formatRatio(ratioFromTonic(note.frequency))}</td>
                <td>
                  <label class="sr-only" for="freq-${note.id}">Frequenza ${note.id}</label>
                  <input
                    id="freq-${note.id}"
                    data-role="frequency-input"
                    data-note-id="${note.id}"
                    type="number"
                    min="1"
                    step="0.01"
                    value="${formatFrequency(note.frequency)}"
                  />
                </td>
                <td>
                  <button type="button" class="ghost" data-action="play-note" data-note-id="${note.id}">Ascolta</button>
                </td>
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  </div>
`

const overviewMarkup = () => `
  <section class="panel intro-panel">
    <div>
      <p class="eyebrow">Web Audio API playground</p>
      <h1>Tuning Lab</h1>
      <p class="lead">
        Esplora il sistema pitagorico, confrontalo con il temperamento equabile e modifica le
        frequenze delle note per sentire subito cosa cambia.
      </p>
    </div>
    <div class="info-grid">
      <article>
        <span class="eyebrow">Preset attivo</span>
        <strong>${currentPreset().name}</strong>
        <p>${currentPreset().description}</p>
      </article>
      <article>
        <span class="eyebrow">Tonica</span>
        <strong>${tonicNote().id}</strong>
        <p>${formatFrequency(tonicNote().frequency)} Hz</p>
      </article>
      <article>
        <span class="eyebrow">Stato</span>
        <strong data-role="playback-label">${state.isPlaying ? 'Riproduzione in corso' : 'In attesa'}</strong>
        <p data-role="status">${state.status}</p>
      </article>
    </div>
  </section>
`

const controlsMarkup = () => `
  <section class="panel controls-panel">
    <div class="control-field">
      <label for="preset-select">Sistema di intonazione</label>
      <select id="preset-select" data-role="preset-select">
        ${presetOptions
          .map(
            (preset) =>
              `<option value="${preset.id}" ${preset.id === state.selectedPresetId ? 'selected' : ''}>${preset.name}</option>`,
          )
          .join('')}
      </select>
    </div>

    <div class="control-field">
      <label for="scale-select">Scala</label>
      <select id="scale-select" data-role="scale-select">
        ${scaleOptions
          .map(
            (scale) =>
              `<option value="${scale.id}" ${scale.id === state.selectedScaleId ? 'selected' : ''}>${scale.name}</option>`,
          )
          .join('')}
      </select>
    </div>

    <div class="control-actions">
      <button type="button" data-action="stop-playback">Stop</button>
      <button type="button" class="secondary" data-action="reset-preset">Ripristina preset</button>
    </div>
  </section>
`

const studioMarkup = () => `
  <section class="workspace-grid">
    <section class="panel keyboard-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Tastiera interattiva</p>
          <h2>Pianoforte</h2>
        </div>
        <p>Suona una nota singola dalla tastiera o dalla tabella.</p>
      </div>
      ${keyboardMarkup()}
    </section>

    <section class="panel scale-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Sequenze</p>
          <h2>Scale e accordi</h2>
        </div>
        <p>Riproduci la scala selezionata in salita, in discesa o come triade.</p>
      </div>
      ${scaleMarkup()}
    </section>

    <section class="panel editor-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Editor</p>
          <h2>Frequenze delle note</h2>
        </div>
        <p>Modifica direttamente i valori per personalizzare il sistema corrente.</p>
      </div>
      ${noteTableMarkup()}
    </section>
  </section>
`

const syncKeyboardState = () => {
  document.querySelectorAll('[data-keyboard-key="true"]').forEach((button) => {
    button.classList.toggle('is-active', state.activeNoteIds.has(button.dataset.noteId))
  })
}

const handleAction = async (action, trigger) => {
  if (action === 'play-note') {
    const note = findNoteById(trigger.dataset.noteId)
    await audioEngine.playNote(note)
    setStatus(`Riproduzione di ${note.id} a ${formatFrequency(note.frequency)} Hz.`)
    return
  }

  if (action === 'play-scale') {
    await audioEngine.playSequence(getScaleNotes())
    setStatus(`Riproduzione della ${currentScale().name} in salita.`)
    return
  }

  if (action === 'play-scale-desc') {
    await audioEngine.playSequence([...getScaleNotes()].reverse())
    setStatus(`Riproduzione della ${currentScale().name} in discesa.`)
    return
  }

  if (action === 'play-chord') {
    await audioEngine.playChord(getTriadNotes())
    setStatus(`Riproduzione dell'accordo costruito sulla ${currentScale().name}.`)
    return
  }

  if (action === 'stop-playback') {
    audioEngine.stopAll()
    setStatus('Riproduzione interrotta.')
    return
  }

  if (action === 'reset-preset') {
    audioEngine.stopAll()
    resetPreset()
  }
}

const updateDynamicUi = () => {
  setStatus(state.status)
  syncKeyboardState()
}

const renderApp = () => {
  app.innerHTML = `
    ${overviewMarkup()}
    <div data-role="controls">${controlsMarkup()}</div>
    <div data-role="workspace">${studioMarkup()}</div>
  `

  updateDynamicUi()
}

app.addEventListener('click', async (event) => {
  const trigger = event.target.closest('[data-action]')

  if (!trigger) {
    return
  }

  await handleAction(trigger.dataset.action, trigger)
})

app.addEventListener('change', (event) => {
  const trigger = event.target

  if (trigger.matches('[data-role="preset-select"]')) {
    selectPreset(trigger.value)
    return
  }

  if (trigger.matches('[data-role="scale-select"]')) {
    state.selectedScaleId = trigger.value
    setStatus(`Scala attiva: ${getScaleById(trigger.value).name}.`)
    renderApp()
    return
  }

  if (trigger.matches('[data-role="frequency-input"]')) {
    const nextValue = Number.parseFloat(trigger.value)

    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      trigger.value = formatFrequency(findNoteById(trigger.dataset.noteId).frequency)
      setStatus('Inserisci una frequenza valida maggiore di zero.')
      return
    }

    updateFrequency(trigger.dataset.noteId, nextValue)
  }
})

renderApp()
