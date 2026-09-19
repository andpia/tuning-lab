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
}

const resetPreset = () => {
  state.notes = buildNotesFromPreset(currentPreset())
  setStatus(`Preset ${currentPreset().name} ripristinato.`)
  renderInteractiveAreas()
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
  renderInteractiveAreas()
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
        <strong>${state.isPlaying ? 'Riproduzione in corso' : 'In attesa'}</strong>
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

const bindEvents = () => {
  document.querySelector('[data-role="preset-select"]').addEventListener('change', (event) => {
    selectPreset(event.target.value)
  })

  document.querySelector('[data-role="scale-select"]').addEventListener('change', (event) => {
    state.selectedScaleId = event.target.value
    setStatus(`Scala attiva: ${getScaleById(event.target.value).name}.`)
    renderInteractiveAreas()
  })

  document.querySelectorAll('[data-action="play-note"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const note = findNoteById(button.dataset.noteId)
      await audioEngine.playNote(note)
      setStatus(`Riproduzione di ${note.id} a ${formatFrequency(note.frequency)} Hz.`)
    })
  })

  document.querySelector('[data-action="play-scale"]').addEventListener('click', async () => {
    const notes = getScaleNotes()
    await audioEngine.playSequence(notes)
    setStatus(`Riproduzione della ${currentScale().name} in salita.`)
  })

  document.querySelector('[data-action="play-scale-desc"]').addEventListener('click', async () => {
    const notes = [...getScaleNotes()].reverse()
    await audioEngine.playSequence(notes)
    setStatus(`Riproduzione della ${currentScale().name} in discesa.`)
  })

  document.querySelector('[data-action="play-chord"]').addEventListener('click', async () => {
    const notes = getTriadNotes()
    await audioEngine.playChord(notes)
    setStatus(`Riproduzione dell'accordo costruito sulla ${currentScale().name}.`)
  })

  document.querySelector('[data-action="stop-playback"]').addEventListener('click', () => {
    audioEngine.stopAll()
    setStatus('Riproduzione interrotta.')
  })

  document.querySelector('[data-action="reset-preset"]').addEventListener('click', () => {
    audioEngine.stopAll()
    resetPreset()
  })

  document.querySelectorAll('[data-role="frequency-input"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const nextValue = Number.parseFloat(event.target.value)

      if (!Number.isFinite(nextValue) || nextValue <= 0) {
        event.target.value = formatFrequency(findNoteById(input.dataset.noteId).frequency)
        setStatus('Inserisci una frequenza valida maggiore di zero.')
        return
      }

      updateFrequency(input.dataset.noteId, nextValue)
    })
  })
}

const renderInteractiveAreas = () => {
  const workspaceNode = document.querySelector('[data-role="workspace"]')
  const controlsNode = document.querySelector('[data-role="controls"]')

  if (controlsNode) {
    controlsNode.innerHTML = controlsMarkup()
  }

  if (workspaceNode) {
    workspaceNode.innerHTML = studioMarkup()
  }

  bindEvents()
}

const updateDynamicUi = () => {
  const statusNode = document.querySelector('[data-role="status"]')
  const stateLabel = document.querySelector('.info-grid article:last-child strong')

  if (statusNode) {
    statusNode.textContent = state.status
  }

  if (stateLabel) {
    stateLabel.textContent = state.isPlaying ? 'Riproduzione in corso' : 'In attesa'
  }

  const keyboardNode = document.querySelector('.keyboard-panel')
  const tableNode = document.querySelector('.editor-panel')

  if (keyboardNode && tableNode) {
    renderInteractiveAreas()
  }
}

const renderApp = () => {
  app.innerHTML = `
    ${overviewMarkup()}
    <div data-role="controls">${controlsMarkup()}</div>
    <div data-role="workspace">${studioMarkup()}</div>
  `

  bindEvents()
}

renderApp()
