const debugMode = false;

var selectedPageToken;

var engajamentoPorHorario = new Array(24);
engajamentoPorHorario = engajamentoPorHorario.fill(0);

var postsPorHorario = new Array(24);
postsPorHorario = postsPorHorario.fill(0);

var engajamentoTotal = 0;

var postsRequisitados = 100;

function statusChangeCallback(response) {  
    // console.log(response);                   // The current login status of the person.
    if (response.status === 'connected' && !debugMode) {   // Logged into your webpage and Facebook.
        switchOverlay("loginFB"); // Desativa o login
        switchOverlay("loading"); // Ativa o loading
        testAPI();
        requestAPI();
    } else {                                 // Not logged into your webpage or we are unable to tell.
        window.location.href = '#login'
    }
}


function checkLoginState() {               // Called when a person is finished with the Login Button.
    FB.getLoginStatus(function (response) {   
        statusChangeCallback(response);
    });
}


window.fbAsyncInit = function () {
    FB.init({
        appId: '467168721026017',
        cookie: true,                     // Enable cookies to allow the server to access the session.
        xfbml: true,                     // Parse social plugins on this webpage.
        version: 'v11.0'           // Use this Graph API version for this call.
    });


    FB.getLoginStatus(function (response) {   // Called after the JS SDK has been initialized.
        statusChangeCallback(response);        // Returns the login status.
    });
};

function testAPI() {                      
    FB.api('/me', function (response) {
        // console.log('Login sucedido para: ' + response.name);
        document.getElementById('user_name').innerHTML = response.name;
    });
}

function requestAPI() {
    FB.api('/me', function (response) { getPageToken(response.id) });
}

function getPageToken(userId) {
    FB.api(userId + '/accounts?fields=access_token',
        function (response) { selectedPageToken = response.data[0].access_token; getPagePosts(selectedPageToken); }
    )
}

function getPagePosts(pageToken) { 
    FB.api('me/feed?fields=id,created_time,full_picture,is_popular, permalink_url, attachments{description}&limit=' + postsRequisitados, { access_token: pageToken },
        function (response) {
            response.data.forEach(function (post) {
                getMetrics(pageToken, post);
            })
        }
    )
}


function getMetrics(pageToken, post) {
    FB.api(post.id + '/insights?metric=post_reactions_by_type_total, post_engaged_users, post_negative_feedback, post_impressions_unique',
        { access_token: pageToken },
        function (response) {
            if (response) {
                var horarioDoPost = convertUTCtoHour(post.created_time);
                var impressoesPost;

                try {
                    impressoesPost = response['data'][3]['values'][0]['value'];
                } catch (error) {
                    impressoesPost = 0; // Se deu erro, é porque foi um post em que a pagina foi marcada.
                    console.error(error);
                }

                impressoesPost = parseInt(impressoesPost, 10);

                if (!Number.isInteger(engajamentoPorHorario[horarioDoPost])) {
                    engajamentoPorHorario[horarioDoPost] = impressoesPost;
                }
                else {
                    engajamentoPorHorario[horarioDoPost] = (engajamentoPorHorario[horarioDoPost] + impressoesPost);
                }

                engajamentoTotal += impressoesPost;
                postsPorHorario[horarioDoPost]++;


                adicionarInfoPostNasMetricas(response, post);



                makeTablesHTML(response);
                generateTableHeader(response['data']);
                insertLineTable(response['data']);

                switchOverlay("finalizarLoading"); // Desliga o loading e ativa o botão
            }
        });
}

function adicionarInfoPostNasMetricas(response, post) {
    if (typeof post.attachments === 'undefined') { // Post nao tem descrição
        description = '---'
    } else {
        description = post.attachments.data[0].description.substr(0, 50) + "..." // Limitando a quantidade de caracteres da descrição na tabela
    }

    tryAddPostInfo(response, "created_time", post.created_time);
    tryAddPostInfo(response, "is_popular", post.is_popular);
    tryAddPostInfo(response, "description", description);
    tryAddPostInfo(response, "full_picture", post.full_picture);
    tryAddPostInfo(response, "permalink_url", post.permalink_url);
    tryAddPostInfo(response, "json", post.id);
}

function tryAddPostInfo(response, titleInfo, value) {
    try {
        response['data'].unshift({ title: titleInfo, values: [{ "value": value }] });
    } catch (error) {
        console.error(error);
        response['data'].unshift({ title: titleInfo, values: [{ "value": "---" }] });
    }
}

function convertUTCtoHour(utcString) { // Converte a string em UTC para horario no formato H (0 - 23)
    var conversion = (((utcString).split('T'))[1]).split(':')[0];
    if (conversion.split("")[0] == '0') {
        conversion = conversion.split("")[1];
    }
    return conversion;
}

function makeTablesHTML(myArray) {
    var maiorEngajamento = Math.max.apply(null, engajamentoPorHorario);
    document.getElementById("json").innerHTML = syntaxHighlight(JSON.stringify(myArray, undefined, 4));
    document.getElementById("horario").innerText = "Maior engajamento acumulado: " + engajamentoPorHorario.indexOf(maiorEngajamento) + "h" + " (" + maiorEngajamento + ").";
}

function showJSONReaderFromPost(idPost) {
    FB.api(idPost + '/insights?metric=post_reactions_by_type_total, post_engaged_users, post_negative_feedback, post_impressions_unique',
        { access_token: selectedPageToken },
        function (response) { 
            document.getElementById('json').innerHTML = syntaxHighlight(JSON.stringify(response, undefined, 4));
        });
    document.getElementById('json').setAttribute('style', 'display:');

    return code;
}

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

function generateTableHeader(data) {
    var html = '';
    if (document.getElementById('example').childNodes.length == 1) {
        if (data[0].constructor === Object) {
            html += '<thead>\r\n'
            html += '<tr>\r\n'

            for (var row in data) {
                html += '<th>' + translateTableHeaderTitle(data[row].title) + '</th>\r\n';
            }

            html += '</tr>\r\n';
            html += '</thead>\r\n';


            html += '<tbody id="body-table">\r\n';
            html += '</tbody>\r\n';

            document.getElementById('example').innerHTML = html;
            return html;
        }
    }
}

function translateTableHeaderTitle(title) {
    switch (title) {
        case "json":
            return "JSON";
        case "permalink_url":
            return "URL";
        case "full_picture":
            return "Imagem"
        case "description":
            return "Descrição"
        case "is_popular":
            return "Popular?"
        case "created_time":
            return "Data de pub."
        case "Lifetime Total post Reactions by Type.":
            return "Reações";
        case "Lifetime Engaged Users":
            return "Indv. engajados";
        case "Lifetime Negative Feedback":
            return "Feedback neg.";
        case "Lifetime Post Total Reach":
            return "Alcance total";
    }
}


// build HTML table data from an array (one or two dimensional)
function insertLineTable(data) {
    var html = '';

    if (data[0].constructor === Object) {
        html += '<tr>\r\n'
        for (var row in data) {
            if (data[row].title == 'full_picture') {
                html += '<td> <img src=' + JSON.stringify(data[row].values[0].value, undefined, 4) + ' width="50%"></td>\r\n';
            }
            else if (data[row].title == 'permalink_url') {
                html += '<td> <a target="_blank" href=' + JSON.stringify(data[row].values[0].value, undefined, 4) + '><i class="bx bx-link-external"></i></a></td>\r\n';
            }
            else if (data[row].title == 'json') {
                html += '<td> <a target="#" onclick=' + 'showJSONReaderFromPost(' + JSON.stringify(data[row].values[0].value, undefined, 4).replace(/"([^"]+)":/g, '$1:') + ')><i class="bx bx-code-curly"></i></a></td>\r\n';
            }
            else {
                html += '<td>' + JSON.stringify(data[row].values[0].value, undefined, 4) + '</td>\r\n';
            }
        }
        html += '</tr>\r\n';
    }

    document.getElementById('body-table').insertAdjacentHTML('beforeend', html);
    return html;
}

function jsTable() {
    new JSTable("#example");
}

function logout() {
    FB.logout(function (response) {
        // user is now logged out
        alert("Usuário deslogado com sucesso.");
    });
    document.location.reload(); //recarrega a pagina
}

function switchOverlay(mode) { // Ativa ou desativa o overlay, com seu respectivo modo.
    if (mode == undefined) {
        if (document.getElementById('login').getAttribute("style") != "display:none") {
            document.getElementById('login').setAttribute("style", "display:none");
        } else {
            document.getElementById('login').setAttribute("style", "display:inline");
        }
    }

    if (mode == "loginFB") {
        if (document.getElementById('loginFB').getAttribute("style") != "display:none") {
            document.getElementById('container').setAttribute("style", "display:none");
            document.getElementById('loginFB').setAttribute("style", "display:none");
        } else {
            document.getElementById('container').setAttribute("style", "display:inline");
            document.getElementById('loginFB').setAttribute("style", "display:inline");
        }
    }

    if (mode == "loading") {
        if (document.getElementById('loading').getAttribute("style") != "display:none") {
            document.getElementById('loading').setAttribute("style", "display:none");
        } else {
            document.getElementById('loading').setAttribute("style", "display:inline");
        }
    }

    if (mode == "continuar") {
        if (document.getElementById('continuar').getAttribute("style") != "display:none") {
            document.getElementById('continuar').setAttribute("style", "display:none");
        } else {
            document.getElementById('continuar').setAttribute("style", "display:inline");
        }
    }

    if (mode == "finalizarLoading") {
        document.getElementById('loading').setAttribute("style", "display:none");
        document.getElementById('continuar').setAttribute("style", "display:inline");
    }
}

alert("Bem-vindo. Membros da Gestão Chamyto não são permitidos por aqui.");