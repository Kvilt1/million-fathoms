import { createRoot } from 'react-dom/client';
import './fonts.css';
import './styles.css';
import { readTierColors } from './game/score';
import { App } from './ui/App';

readTierColors();
createRoot(document.getElementById('root')!).render(<App />);
