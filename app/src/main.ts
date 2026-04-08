import './lib/themes/cyberpunk.css'
import './lib/themes/terminal.css'
import './lib/themes/clean-dark.css'
import './lib/themes/light.css'
import './lib/themes/corporate.css'
import './lib/effects.css'
import App from './App.svelte'
import { mount } from 'svelte'

mount(App, { target: document.getElementById('app')! })
