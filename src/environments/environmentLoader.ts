import { environment as defaultEnvironment } from './environment';
export const environmentLoader = new Promise<any>((resolve) => {
  const url = './config/config.json';

  fetch(url)
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Failed to load config file');
      }
    })
    .then((config) => resolve(config))
    .catch(() => {
      resolve(defaultEnvironment)
    });
});
