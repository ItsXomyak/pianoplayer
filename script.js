let ctx
const piano = document.getElementById('piano')
const interactiveModeBtn = document.getElementById('interactiveMode')
const preparedModeBtn = document.getElementById('preparedMode')
const preparedControls = document.getElementById('preparedControls')
const recordBtn = document.getElementById('record')
const stopRecordBtn = document.getElementById('stopRecord')
const downloadBtn = document.getElementById('download')
const recordingIndicator = document.getElementById('recordingIndicator')
const loadSongInput = document.getElementById('loadSong')
const playBtn = document.getElementById('play')
const pauseBtn = document.getElementById('pause')
const stopBtn = document.getElementById('stop')
const playbackSpeed = document.getElementById('playbackSpeed')
const progressBar = document.getElementById('progress')

const keyMap = {
	// Черные ноты (C#3-D#5)
	1: 'C#3',
	2: 'D#3',
	3: 'F#3',
	4: 'G#3',
	5: 'A#3',
	6: 'C#4',
	7: 'D#4',
	8: 'F#4',
	9: 'G#4',
	0: 'A#4',
	'-': 'C#5',
	'=': 'D#5',
	Backspace: 'D#5',

	// Белые ноты (C3-B3)
	q: 'C3',
	w: 'D3',
	e: 'E3',
	r: 'F3',
	t: 'G3',
	y: 'A3',
	u: 'B3',

	// Белые ноты (C4-B4)
	a: 'C4',
	s: 'D4',
	d: 'E4',
	f: 'F4',
	g: 'G4',
	h: 'A4',
	j: 'B4',

	// Белые ноты (C5-E5)
	k: 'C5',
	l: 'D5',
	';': 'E5',
}

const noteFrequencies = {
	C3: 130.81,
	'C#3': 138.59,
	D3: 146.83,
	'D#3': 155.56,
	E3: 164.81,
	F3: 174.61,
	'F#3': 185.0,
	G3: 196.0,
	'G#3': 207.65,
	A3: 220.0,
	'A#3': 233.08,
	B3: 246.94,
	C4: 261.63,
	'C#4': 277.18,
	D4: 293.66,
	'D#4': 311.13,
	E4: 329.63,
	F4: 349.23,
	'F#4': 369.99,
	G4: 392.0,
	'G#4': 415.3,
	A4: 440.0,
	'A#4': 466.16,
	B4: 493.88,
	C5: 523.25,
	'C#5': 554.37,
	D5: 587.33,
	'D#5': 622.25,
	E5: 659.25,
}

const noteToFileMap = {
	C3: 'c1.wav',
	'C#3': 'c1s.wav',
	D3: 'd1.wav',
	'D#3': 'd1s.wav',
	E3: 'e1.wav',
	F3: 'f1.wav',
	'F#3': 'f1s.wav',
	G3: 'g1.wav',
	'G#3': 'g1s.wav',
	A3: 'a1.wav',
	'A#3': 'a1s.wav',
	B3: 'b1.wav',
	C4: 'c1.wav',
	'C#4': 'c1s.wav',
	D4: 'd1.wav',
	'D#4': 'd1s.wav',
	E4: 'e1.wav',
	F4: 'f1.wav',
	'F#4': 'f1s.wav',
	G4: 'g1.wav',
	'G#4': 'g1s.wav',
	A4: 'a1.wav',
	'A#4': 'a1s.wav',
	B4: 'b1.wav',
	C5: 'c1.wav',
	'C#5': 'c1s.wav',
	D5: 'd1.wav',
	'D#5': 'd1s.wav',
	E5: 'e1.wav',
}

const state = {
	mode: 'interactive',
	isRecording: false,
	startTime: 0,
	notes: [],
	bufferMap: {},
	loadedSong: null,
	isPlaying: false,
	playbackStartTime: 0,
	pausedTime: 0,
}

function initAudioContext() {
	if (!ctx) {
		ctx = new AudioContext()
		if (ctx.state === 'suspended') {
			ctx.resume()
		}
	}
}

async function loadSample(note) {
	const fileName = noteToFileMap[note]
	try {
		const response = await fetch(`wav/${fileName}`)
		if (!response.ok) throw new Error(`HTTP ${response.status}`)
		const arrayBuffer = await response.arrayBuffer()
		return await ctx.decodeAudioData(arrayBuffer)
	} catch (err) {
		alert(`Failed to load audio for ${note}`)
		return null
	}
}

async function loadSamples() {
	initAudioContext()
	const notes = Object.keys(noteToFileMap)
	for (const note of notes) {
		const buffer = await loadSample(note)
		if (buffer) {
			state.bufferMap[note] = buffer
		}
	}
}

function playNote(note, duration = 2.0) {
	if (!ctx) initAudioContext()
	if (!state.bufferMap[note] || !noteFrequencies[note]) return

	const source = ctx.createBufferSource()
	source.buffer = state.bufferMap[note]

	const baseNote = note.replace('4', '3')
	const playbackRate = noteFrequencies[note] / noteFrequencies[baseNote]
	source.playbackRate.value = playbackRate

	const gain = ctx.createGain()
	const lowpass = ctx.createBiquadFilter()
	const now = ctx.currentTime

	const attack = 0.03
	const decay = 0.2
	const sustain = 0.7
	const release = 1.5

	gain.gain.setValueAtTime(0, now)
	gain.gain.linearRampToValueAtTime(0.9, now + attack)
	gain.gain.linearRampToValueAtTime(sustain, now + attack + decay)
	gain.gain.setValueAtTime(sustain, now + duration)
	gain.gain.linearRampToValueAtTime(0, now + duration + release)

	lowpass.type = 'lowpass'
	lowpass.frequency.setValueAtTime(800, now)

	source.connect(gain)
	gain.connect(lowpass)
	lowpass.connect(ctx.destination)
	source.start(now)
	source.stop(now + duration + release)
}

function handleKeyPress(event) {
	if (state.mode !== 'interactive') return
	initAudioContext()
	const note = keyMap[event.key.toLowerCase()]
	if (note) {
		const keyElement = document.querySelector(`[data-note="${note}"]`)
		if (keyElement && !keyElement.classList.contains('active')) {
			keyElement.classList.add('active')
			playNote(note)
			if (state.isRecording) {
				state.notes.push({
					key: note,
					startTime: Date.now() - state.startTime,
					duration: 0,
				})
			}
		}
	}
}

function handleKeyRelease(event) {
	if (state.mode !== 'interactive') return
	const note = keyMap[event.key.toLowerCase()]
	if (note) {
		const keyElement = document.querySelector(`[data-note="${note}"]`)
		if (keyElement) {
			keyElement.classList.remove('active')
			if (state.isRecording) {
				const noteEntry = state.notes.find(
					n => n.key === note && n.duration === 0
				)
				if (noteEntry) {
					noteEntry.duration =
						Date.now() - state.startTime - noteEntry.startTime
				}
			}
		}
	}
}

function handleMouseDown(event) {
	if (state.mode !== 'interactive') return
	initAudioContext()
	const key = event.target.closest('.key')
	if (key && !key.classList.contains('active')) {
		key.classList.add('active')
		playNote(key.dataset.note)
		if (state.isRecording) {
			state.notes.push({
				key: key.dataset.note,
				startTime: Date.now() - state.startTime,
				duration: 0,
			})
		}
	}
}

function handleMouseUp(event) {
	const key = event.target.closest('.key')
	if (key) {
		key.classList.remove('active')
		if (state.isRecording) {
			const noteEntry = state.notes.find(
				n => n.key === key.dataset.note && n.duration === 0
			)
			if (noteEntry) {
				noteEntry.duration = Date.now() - state.startTime - noteEntry.startTime
			}
		}
	}
}

function startRecording() {
	state.isRecording = true
	state.startTime = Date.now()
	state.notes = []
	recordBtn.disabled = true
	stopRecordBtn.disabled = false
	downloadBtn.disabled = true
	recordingIndicator.style.display = 'inline-block'
}

function stopRecording() {
	state.isRecording = false
	recordBtn.disabled = false
	stopRecordBtn.disabled = true
	downloadBtn.disabled = false
	recordingIndicator.style.display = 'none'
}

function downloadRecording() {
	const recording = {
		name: 'My Song',
		duration:
			state.notes.length > 0
				? state.notes[state.notes.length - 1].startTime +
				  state.notes[state.notes.length - 1].duration
				: 0,
		notes: state.notes,
	}
	const blob = new Blob([JSON.stringify(recording, null, 2)], {
		type: 'application/json',
	})
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'recording.json'
	a.click()
	URL.revokeObjectURL(url)
}

function switchToInteractiveMode() {
	state.mode = 'interactive'
	interactiveModeBtn.classList.add('active')
	preparedModeBtn.classList.remove('active')
	preparedControls.style.display = 'none'
}

function switchToPreparedMode() {
	state.mode = 'prepared'
	preparedModeBtn.classList.add('active')
	interactiveModeBtn.classList.remove('active')
	preparedControls.style.display = 'flex'
}

function loadSong(event) {
	const file = event.target.files[0]
	if (!file) return
	const reader = new FileReader()
	reader.onload = e => {
		try {
			const song = JSON.parse(e.target.result)
			if (!song.name || !song.duration || !Array.isArray(song.notes)) {
				throw new Error('Invalid JSON format')
			}
			song.notes.forEach(note => {
				if (
					!note.key ||
					!noteFrequencies[note.key] ||
					typeof note.startTime !== 'number' ||
					typeof note.duration !== 'number'
				) {
					throw new Error('Invalid note format')
				}
			})
			state.loadedSong = song
			alert('Song loaded successfully')
		} catch (err) {
			alert(`Failed to load song: ${err.message}`)
		}
	}
	reader.readAsText(file)
}

function playSong() {
	if (!state.loadedSong || state.isPlaying) return
	state.isPlaying = true
	state.playbackStartTime = Date.now()
	state.pausedTime = 0
	playBtn.disabled = true
	pauseBtn.disabled = false
	stopBtn.disabled = false

	const speed = parseFloat(playbackSpeed.value)
	const notes = state.loadedSong.notes

	notes.forEach(note => {
		const delay = note.startTime / speed
		setTimeout(() => {
			if (state.isPlaying) {
				playNote(note.key, note.duration / 1000)
				const keyElement = document.querySelector(`[data-note="${note.key}"]`)
				if (keyElement) {
					keyElement.classList.add('active')
					setTimeout(() => keyElement.classList.remove('active'), note.duration)
				}
				updateProgressBar(note.startTime, state.loadedSong.duration, speed)
			}
		}, delay)
	})
}

function pauseSong() {
	if (!state.isPlaying) return
	state.isPlaying = false
	state.pausedTime = Date.now() - state.playbackStartTime
	playBtn.disabled = false
	pauseBtn.disabled = true
}

function resumeSong() {
	if (state.isPlaying || !state.loadedSong) return
	state.isPlaying = true
	state.playbackStartTime = Date.now() - state.pausedTime
	playBtn.disabled = true
	pauseBtn.disabled = false

	const speed = parseFloat(playbackSpeed.value)
	const notes = state.loadedSong.notes.filter(
		note => note.startTime > state.pausedTime * speed
	)

	notes.forEach(note => {
		const delay = (note.startTime - state.pausedTime * speed) / speed
		setTimeout(() => {
			if (state.isPlaying) {
				playNote(note.key, note.duration / 1000)
				const keyElement = document.querySelector(`[data-note="${note.key}"]`)
				if (keyElement) {
					keyElement.classList.add('active')
					setTimeout(() => keyElement.classList.remove('active'), note.duration)
				}
				updateProgressBar(note.startTime, state.loadedSong.duration, speed)
			}
		}, delay)
	})
}

function stopSong() {
	state.isPlaying = false
	state.pausedTime = 0
	playBtn.disabled = false
	pauseBtn.disabled = true
	stopBtn.disabled = true
	progressBar.style.width = '0%'
}

function updateProgressBar(currentTime, totalDuration, speed) {
	const progress = (currentTime / totalDuration) * 100
	progressBar.style.width = `${Math.min(progress, 100)}%`
}

window.addEventListener('load', () => {
	loadSamples()
})

document.addEventListener('keydown', handleKeyPress)
document.addEventListener('keyup', handleKeyRelease)
piano.addEventListener('mousedown', handleMouseDown)
piano.addEventListener('mouseup', handleMouseUp)
recordBtn.addEventListener('click', startRecording)
stopRecordBtn.addEventListener('click', stopRecording)
downloadBtn.addEventListener('click', downloadRecording)
interactiveModeBtn.addEventListener('click', switchToInteractiveMode)
preparedModeBtn.addEventListener('click', switchToPreparedMode)
loadSongInput.addEventListener('change', loadSong)
playBtn.addEventListener('click', () =>
	state.isPlaying ? resumeSong() : playSong()
)
pauseBtn.addEventListener('click', pauseSong)
stopBtn.addEventListener('click', stopSong)

switchToInteractiveMode()
