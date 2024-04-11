/* Serveur Web pour le projet */

// Librairies
const http = require('http');
const fs = require('fs');
require('dotenv').config()
const { Client } = require('pg');
const crypto = require('crypto');

// Constantes
const host = 'localhost';
const port = 8080;
const server = http.createServer();

const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'application_image',
    port: 5432
});

let lastSessionId = 0;
let sessions = [];

client.connect()
.then(() => {
    console.log('Connected to database');
})
.catch((e) => {
    console.error("Error connecting to database");
    console.error(e);
});

server.on('request', (req, res) => {
    let hasCookieWithSessionId = false;
    let sessionId = undefined;
    if (req.headers['cookie'] !== undefined){
        let sessionIdInCookie = req.headers['cookie'].split(';').find(item => item.startsWith('session-id'));
        if (sessionIdInCookie !== undefined){
            let sessionIdInt = parseInt(sessionIdInCookie.split('=')[1]);
            if (sessions[sessionIdInt]){
                hasCookieWithSessionId = true;
                sessionId = sessionIdInt;
                sessions[sessionId].nbRequest++;
            }
        }
    }
    if (!hasCookieWithSessionId){
        lastSessionId++;
        sessionId = lastSessionId;
        sessions[sessionId] = {nbRequest: 0};
    }

    if (req.url.startsWith('/public/')){
        try{
            const file = fs.readFileSync(`.${req.url}`);
            res.end(file);
        } catch (err) {
            console.log(err);
            res.end('erreur ressource');
        }
        return;
    } else if (req.url === '/images') {
        const userId = sessions[sessionId] && sessions[sessionId].userId ? sessions[sessionId].userId : null;
        client.query(`
            SELECT images.id, images.nom, images.fichier, accounts_images_like.liked
            FROM images
            LEFT JOIN accounts_images_like
            ON images.id = accounts_images_like.image_id
            AND accounts_images_like.account_id = $1
            ORDER BY images.id ASC
        `, [userId])
        .then((result) => {
            let images = result.rows;
            const length = images.length;
            let html;

            if (sessionId !== undefined && sessions[sessionId] !== undefined && sessions[sessionId].username !== undefined){
                let username = sessions[sessionId].username
                html = `<!DOCTYPE html>
                        <html lang="fr">
                        <head>
                            <meta charset="UTF-8">
                            <title>Mur d'images</title>
                            <link rel="stylesheet" href="/style">
                        </head>
                        <body>
                            <div>
                                <span>Bonjour ${username}</span>
                                <a href="/signout">Se déconnecter</a>
                            </div>
                            <a href="/">Index</a>
                            <div class="center">
                                <h1>Mur d'images</h1>
                            </div>
                            <div id="mur">
                                ${images.map((image) => {
                                    let likeLink = '';
                                    if (image.liked){
                                        likeLink = 'Liked'
                                    } else {
                                        likeLink = `<a href="/like/${image.id}">Like</a>`
                                    }
                                    return `
                                        <a href="/page-image/${image.id}"><img src="/public/images/${image.fichier}" alt="${image.nom}" width="300"></a>
                                        ${likeLink}
                                    `;
                                }).join('')}
                            </div>
                            <footer class="footer">Retrouvez le dépôt git <a href="/github">ici</a></footer>
                            </body>
                            </html>
                        `;
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            } else {
                html = `<!DOCTYPE html>
                        <html lang="fr">
                        <head>
                            <meta charset="UTF-8">
                            <title>Mur d'images</title>
                            <link rel="stylesheet" href="/style">
                        </head>
                        <body>
                            <div>
                                <a href="/signup">S'inscrire</a>
                                <a href="/signin">Se connecter</a>
                            </div>
                            <a href="/">Index</a>
                            <div class="center">
                                <h1>Mur d'images</h1>
                            </div>
                            <div id="mur">
                                ${images.map((image) => {
                                    return `<a href="/page-image/${image.id}"><img src="/public/images/${image.fichier}" alt="${image.nom}" width="300"></a>`;
                                }).join('')}
                            </div>
                            <footer class="footer">Retrouvez le dépôt git <a href="/github">ici</a></footer>
                        </body>
                        </html>
                        `;
                // for (let i = 0; i < length; i++) {
                //     html += `<a href="/page-image/${images[i].id}"><img src="/public/images/image${images[i].id}.jpg" alt="image${images[i].id}" width="300"></a>`;
                // }
                // html += `</div><footer class="footer">Retrouvez le dépôt git <a href="/github">ici</a></footer></body></html>`;
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            }
        })
        .catch((e) => {
            console.error("ERROR Getting images");
            console.error(e);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('Erreur interne');
        })
        // client.query('SELECT * FROM images', (err, resp) => {
        //     if (err) throw err;
        //     const images = resp.rows;
        //     const length = images.length;

        //     let html;
        //     if (sessionId !== undefined && sessions[sessionId] !== undefined && sessions[sessionId].username !== undefined){
        //         let username = sessions[sessionId].username
        //         html = `<!DOCTYPE html>
        //                 <html lang="fr">
        //                 <head>
        //                     <meta charset="UTF-8">
        //                     <title>Mur d'images</title>
        //                     <link rel="stylesheet" href="/style">
        //                 </head>
        //                 <body>
        //                     <div>
        //                         <span>Bonjour ${username}</span>
        //                         <a href="/signout">Se déconnecter</a>
        //                     </div>
        //                     <a href="/">Index</a>
        //                     <div class="center">
        //                         <h1>Mur d'images</h1>
        //                     </div>
        //                     <div id="mur">
        //                 `;
        //         for (let i = 0; i < length; i++){
        //             html += `<a href="/page-image/${images[i].id}"><img src="/public/images/image${images[i].id}.jpg" alt="image${images[i].id}" width="300"></a>`;
        //             html += `<a href="/like/${images[i].id}">Like</a>`;
        //         }
        //         html += `</div><footer class="footer">Retrouvez le dépôt git <a href="/github">ici</a></footer></body></html>`
                
        //     } else {
        //         html = `<!DOCTYPE html>
        //                 <html lang="fr">
        //                 <head>
        //                     <meta charset="UTF-8">
        //                     <title>Mur d'images</title>
        //                     <link rel="stylesheet" href="/style">
        //                 </head>
        //                 <body>
        //                     <div>
        //                         <a href="/signup">S'inscrire</a>
        //                         <a href="/signin">Se connecter</a>
        //                     </div>
        //                     <a href="/">Index</a>
        //                     <div class="center">
        //                         <h1>Mur d'images</h1>
        //                     </div>
        //                     <div id="mur">
        //                 `;
        //         for (let i = 0; i < length; i++) {
        //             html += `<a href="/page-image/${images[i].id}"><img src="/public/images/image${images[i].id}.jpg" alt="image${images[i].id}" width="300"></a>`;
        //         }
        //         html += `</div><footer class="footer">Retrouvez le dépôt git <a href="/github">ici</a></footer></body></html>`;
        //     }
        //     res.end(html);
        // });
    } else if (req.url === '/style') {
        res.end(fs.readFileSync('public/style.css', 'utf-8'));
    } else if (req.url === '/logo') {
        res.end(fs.readFileSync('public/images/logo.png'));
    } else if (req.url.startsWith('/page-image')) {
        // Gère les pages d'images
        console.log("URL: ", req.url);
        const id = parseInt(req.url.split('/')[2], 10);
        console.log("ID: ", id);
        const images = fs.readdirSync('public/images');
        const length = images.filter((image) => !image.endsWith('_small.jpg') && image != "logo.png").length;
        if (Number.isInteger(id)){
            client.query('SELECT * FROM images WHERE id = $1', [id], (err, resp) => {
                if (err) throw err;
                const image = resp.rows[0];

                client.query('SELECT * FROM commentaires WHERE id_image = $1', [id], (err, resp) => {
                    if (err) throw err;
                    const commentaires = resp.rows;

                    let html = '<!DOCTYPE html>'
                    html += `<html>
                            <head>
                                <meta charset="UTF-8">
                                <title>Image ${id}</title>
                                <link rel="stylesheet" href="/style">
                            </head>
                            <body>`;
                    html += `<a href=/images>Mur</a><div class="center"><img src="/public/images/image${id}.jpg" width="350"><p>${image.nom}</p></div>`;
                    html += `<div class=center><h4>Commentaires</h4>`;
                    for (let commentaire of commentaires) {
                        html += `<div> -- ${commentaire.texte} -- </div>`;
                    }
                    html += `<h4>Ajouter un nouveau commentaire</h4>`;
                    html += `<form action="/image-description" method="POST">
                                <input type="hidden" name="numero" id="numero" value="${id}">
                                <label for="commentaire">Commentaire : </label>
                                <input type="text" name="commentaire" id="commentaire">
                                <input type="submit" value="Envoyer">
                            </form></div>`;

                    if (id > 1 && id < length){
                        html += `<div><span class="left"><a href="/page-image/${id-1}"><img src="/public/images/image${id-1}_small.jpg"></a></span><span class="right"><a href=/page-image/${id+1}><img src="/public/images/image${id+1}_small.jpg"></a></span></div>`;
                    }
                    else if (id == 1) {
                        html += `<div><span class="left"></span><span class="right"><a href=/page-image/${id+1}><img src="/public/images/image${id+1}_small.jpg"></a></span></div>`;
                    }
                    else if (id == length) {
                        html += `<div><span class="left"><a href="/page-image/${id-1}"><img src="/public/images/image${id-1}_small.jpg"></a></span><span class="right"></span></div>`;
                    }
                    html += `<footer class="footer">Retrouvez le dépôt git <a href="/github">ici</a></footer></body><script type="text/javascript" src='/public/page-image.js'></script></html>`;
                    res.end(html);
                });
            });
        } else {
            console.error('Erreur id');
        }
    }
    // Méthodes pour les commentaires -> formulaire
    else if (req.method === 'POST' && req.url === '/image-description') {
        let donnees;
        req.on('data', (dataChunk) => {
            donnees += dataChunk.toString();
        });
        req.on('end', () => {
            const paramValue = donnees.split('&');
            const imageId = Number(paramValue[0].split('=')[1]);
            let commentaire = paramValue[1].split('=')[1];

            commentaire = commentaire.replace('+', ' ');   // Remplace '+' par ' '

            try {
                commentaire = decodeURIComponent(commentaire); // Remplace les caractères spéciaux
            } catch(err) {
                console.error(err);
                let html = `<!DOCTYPE html>
                            <html>
                                <head>
                                    <meta charset="UTF-8>
                                    <title>ERREUR SERVEUR</title>
                                </head>
                                <body>
                                    <p style="color: red;">ERREUR ${err}</p>
                                    <a href="/page-image/${imageId}">Revenir à la page ${imageId}</a>
                                </body>
                            </html>`;
                res.end(html);
            }

            client.query('INSERT INTO commentaires (id_image, texte) VALUES ($1, $2)', [imageId, commentaire], (err, resp) => {
                if (err) throw err;
                res.writeHead(302, { Location: `/page-image/${imageId}` });
                res.end();
            });
        });
    } 
    // Lien vers mon dépôt git (non-obligatoire)
    else if (req.url === "/github") {
        res.writeHead(302, { Location: 'https://github.com/Illumye/bddweb-project' });
        res.end();
    }
    else if (req.url === '/signup' && req.method === 'GET') {
        res.end(generateSignFormPage(true));
    } else if (req.url === '/signup' && req.method === 'POST') {
        let data;
        req.on('data', (dataChunk) => {
            data += dataChunk.toString();
        });
        req.on('end', async () => {
            try {
                const params = data.split('&');
                const username = params[0].split('=')[1];
                const password = params[1].split('=')[1];
                const findQuery = `SELECT count(username) FROM account WHERE username='${username}'`;
                const findResult = await client.query(findQuery);
                const USERNAME_IS_UNKNOWN = 0;
                if (parseInt(findResult.rows[0].count) === USERNAME_IS_UNKNOWN){
                    const salt = crypto.randomBytes(16).toString('hex');
                    const hash = crypto.createHash('sha256').update(password).update(salt).digest('hex');
                    const insertQuery = `INSERT INTO account (username, salt, hash) VALUES ('${username}', DECODE('${salt}','hex'), DECODE('${hash}','hex'))`;
                    await client.query(insertQuery);
                    res.writeHead(302, { 'Location': '/' });
                    res.end();
                } else {
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>Erreur</title>
                        </head>
                        <body>
                            <h1>Erreur</h1>
                            <p>Le nom d'utilisateur est déjà utilisé</p>
                            <a href="/signup">Réessayer</a>
                        </body>
                        </html>
                    `);
                }
            } catch(e) {
                console.log(e);
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>Erreur</title>
                    </head>
                    <body>
                        <h1>Erreur</h1>
                        <p>Une erreur est survenue</p>
                        <a href="/signup">Réessayer</a>
                    </body>
                    </html>
                `)
            }
        });
    } else if (req.url === '/signin' && req.method === 'GET') {
        res.end(generateSignFormPage(false));
    } else if (req.url === '/signin' && req.method === 'POST') {
        let data;
        req.on('data', (dataChunk) => {
            data += dataChunk.toString();
        });
        req.on('end', async () => {
            try {
                const params = data.split('&');
                const username = params[0].split('=')[1];
                const password = params[1].split('=')[1];
                const findQuery = {
                    text: "SELECT id, username, ENCODE(salt,'hex') as salt, ENCODE(hash, 'hex') as hash FROM account WHERE username=$1",
                    values: [username]
                };
                const findResult = await client.query(findQuery);
                const USERNAME_IS_UNKNOWN = 0;
                if (parseInt(findResult.rows.length) !== USERNAME_IS_UNKNOWN){
                    const salt = findResult.rows[0].salt;
                    const trueHash = findResult.rows[0].hash;
                    const computedHash = crypto.createHash('sha256').update(password).update(salt).digest('hex');
                    if (trueHash === computedHash) {
                        sessions[sessionId].username = username;
                        let userId = findResult.rows[0].id;
                        sessions[sessionId].userId = userId;
                        res.setHeader('Set-Cookie', `session-id=${sessionId}; HttpOnly; Path=/`)
                        res.writeHead(302, { 'Location': '/' })
                        res.end();
                    } else {
                        res.end(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <title>Erreur</title>
                            </head>
                            <body>
                                <h1>Erreur</h1>
                                <p>Mot de passe incorrect</p>
                                <a href="/signin">Réessayer</a>
                            </body>
                            </html>
                        `);
                    }
                } else {
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <title>Erreur</title>
                        </head>
                        <body>
                            <h1>Erreur</h1>
                            <p>Le nom d'utilisateur est inconnu</p>
                            <a href="/signin">Réessayer</a>
                        </body>
                        </html>
                    `);
                }
            } catch(e) {
                console.log(e);
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>Erreur</title>
                    </head>
                    <body>
                        <h1>Erreur</h1>
                        <p>Une erreur est survenue</p>
                        <a href="/signin">Réessayer</a>
                    </body>
                    </html>
                `)
            }
        });
    } else if (req.url === '/signout'){
        if (sessionId && sessions[sessionId]){
            delete sessions[sessionId];
            res.writeHead(302, { 'Location': '/' });
            res.end();
        } else {
            res.writeHead(302, { 'Location': '/' });
            res.end();
        }
    }
    // Page d'accueil / racine
    else if (req.url === "/") {
        client.query('SELECT * FROM images ORDER BY date DESC LIMIT 3', (err, resp) => {
            if (err) throw err;

            let html;

            if (sessionId !== undefined && sessions[sessionId] !== undefined && sessions[sessionId].username !== undefined){
                let username = sessions[sessionId].username
                html = `<!DOCTYPE html>
                        <html lang="fr">
                        <head>
                            <meta charset="UTF-8">
                            <title>Mon Mur d'images</title>
                            <link rel="stylesheet" href="/style">
                        </head>
                        <body>
                            <div>
                                <span>Bonjour ${username}</span>
                                <a href="/signout">Se déconnecter</a>
                            </div>
                            <div class="center">
                                <img src="/logo" width="100">
                                <p>Vous trouverez ici toutes les images que j'aime</p>
                                <div>
                        `;
                
            } else {
                html = `<!DOCTYPE html>
                        <html lang="fr">
                        <head>
                            <meta charset="UTF-8">
                            <title>Mon Mur d'images</title>
                            <link rel="stylesheet" href="/style">
                        </head>
                        <body>
                            <div>
                                <a href="/signup">S'inscrire</a>
                                <a href="/signin">Se connecter</a>
                            </div>
                            <div class="center">
                                <img src="/logo" width="100">
                                <p>Vous trouverez ici toutes les images que j'aime</p>
                                <div>
                        `;
            }
            for (let row of resp.rows){
                html += `<a href="/page-image/${row.id}"><img src="/public/images/image${row.id}.jpg" alt="image${row.id}" width="300"></a>`;
            }
            html += `
                    </div>
                    <a href="/images">Voir toutes les images</a>
                    </div>
                    <footer class="footer">Retrouvez le dépôt git <a href="/github">ici</a></footer></body></html>`;
            res.end(html);
        });
    } else if (req.url.startsWith('/like/')) {
        const imageId = parseInt(req.url.split('/')[2], 10);
        console.log("Image ID: ", imageId)
        const userId = sessions[sessionId].userId;
        console.log("User ID: ", userId)
        // récupérer l'id du compte qui like
        if (Number.isInteger(imageId)) {
            client.query('SELECT * FROM accounts_images_like WHERE image_id = $1 AND account_id = $2', [imageId, userId])
            .then((result) => {
                if (result.rows.length === 0){
                    client.query('INSERT INTO accounts_images_like (image_id, account_id, liked) VALUES ($1, $2, true)', [imageId, userId])
                    .then(() => {
                        client.query('UPDATE images SET likes = likes + 1 WHERE id = $1', [imageId])
                        .then(() => {
                            res.writeHead(302, { Location: `/images`});
                            res.end();
                        })
                        .catch((e) => {
                            console.error("ERROR Updating likes");
                            console.error(e);
                            res.writeHead(500, { 'Content-Type': 'text/html' });
                            res.end('Erreur interne');
                        })
                    })
                    .catch((e) => {
                        console.error("ERROR Inserting like");
                        console.error(e);
                        res.writeHead(500, { 'Content-Type': 'text/html' });
                        res.end('Erreur interne');
                    })
                }
            })
            .catch((e) => {
                console.error("ERROR Checking if image already liked");
                console.error(e);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('Erreur interne');
            });

        } else {
            console.error("Erreur id");
            res.writeHead(302, { Location: '/images' });
            res.end();
        }
    // Page 404
    } else {
        let html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 Not Found</title>
            <link rel="stylesheet" href="/style">
        </head>
        <body>
        <div class="center">
            <h1>404</h1>
            <p>La page ou la ressource demandée n'existe pas</p>
            <a href="/">Revenir à l'index</a>
            <footer class="footer">Retrouvez le dépôt git <a href="/github">ici</a></footer>
        </div>
        </body>
        </html>
        `
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(html);
    }
});

function generateSignFormPage(up){
    let signWhat = up ? "signup" : "signin";
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${up ? "Inscription" : "Connexion"}</title>
    </head>
    <body>
        <h1>${up ? "Inscription" : "Connexion"}</h1>
        <form action='${signWhat}' method="POST">
            <label for="username">Username: </label>
            <input type="text" name="username" id="username" required>
            <label for="password">Password: </label>
            <input type="password" name="password" id="password" required>
            <input type="submit" value="${up ? "S'inscire" : "Se connecter"}">
        </form>
    </body>
    </html>
    `
}

server.listen(port, () => {
    console.log(`Server running at http://${host}:${port}/`);
    sessions = [];
});
