import { Config } from '@remotion/cli/config';
import path from 'node:path';

// Serve static files from the main project's public folder
// so all models, textures, HDRI, fonts, etc. are available
Config.setPublicDir(path.join(__dirname, '..', 'public'));
