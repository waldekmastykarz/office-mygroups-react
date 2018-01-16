var adalConfig = {
  tenant: 'common',
  clientId: '6adc6679-0dc6-4057-99b5-f347726d5205',
  extraQueryParameter: 'nux=1',
  disableRenewal: true,
  endpoints: {
    'https://graph.microsoft.com': 'https://graph.microsoft.com'
  }
  // cacheLocation: 'localStorage', // enable this for IE, as sessionStorage does not work for localhost. 
};

module.exports = adalConfig;