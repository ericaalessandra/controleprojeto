// Script de Teste da Chave API do Google Gemini
// Execute com: node test-gemini-key.js

const https = require('https');
const fs = require('fs');

// Ler a chave do arquivo .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/VITE_GEMINI_API_KEY=(.+)/);

if (!match || !match[1] || match[1].trim() === '') {
    console.error('❌ ERRO: Chave API não encontrada no .env.local');
    process.exit(1);
}

const apiKey = match[1].trim();
console.log('🔑 Testando chave:', apiKey.substring(0, 10) + '...');

// Teste 1: Listar modelos disponíveis
const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

console.log('\n📡 Fazendo requisição para Google Gemini API...\n');

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => data += chunk);

    res.on('end', () => {
        if (res.statusCode === 200) {
            const models = JSON.parse(data);
            console.log('✅ CHAVE ATIVA! Modelos disponíveis:\n');
            models.models.slice(0, 5).forEach(m => {
                console.log(`  - ${m.name}`);
            });
            console.log('\n✅ Sua chave está funcionando corretamente!');
            console.log('📌 Se ainda tiver erro 404 no app, o problema é no proxy ou no código.\n');
        } else if (res.statusCode === 400) {
            console.error('❌ ERRO 400: Chave inválida ou projeto sem permissão.');
            console.error('🔧 Solução: Crie uma nova chave em https://aistudio.google.com/app/apikey\n');
        } else if (res.statusCode === 403) {
            console.error('❌ ERRO 403: API não está ativada no seu projeto.');
            console.error('🔧 Solução: Ative a API em https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com\n');
        } else if (res.statusCode === 404) {
            console.error('❌ ERRO 404: Endpoint não encontrado.');
            console.error('Resposta:', data);
        } else {
            console.error(`❌ ERRO ${res.statusCode}:`);
            console.error(data);
        }
    });

}).on('error', (err) => {
    console.error('❌ ERRO de rede:', err.message);
});
