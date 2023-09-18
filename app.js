const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json'); // Crie este arquivo abaixo

// Simulando um banco de dados de usuários
const users = [
  { id: 1, username: 'usuario', password: 'senha123' }
];

// Middleware para autenticação JWT
function authenticateToken(req, res, next) {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'Token não fornecido' });
  
    // O token deve começar com "Bearer " seguido pelo token JWT
    const tokenParts = token.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'Token inválido' });
    }
  
    const jwtToken = tokenParts[1];
  
    jwt.verify(jwtToken, 'seu_segredo', (err, user) => {
      if (err) {
        return res.status(401).json({ message: 'Token inválido' });
      }
      req.user = user; // Se a verificação for bem-sucedida, você pode acessar os dados do usuário na rota protegida
      next();
    });
}

app.use(express.json());

// Rota de autenticação
app.post('/login', (req, res) => {
  // Verifique as credenciais do usuário
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  // Gere um token JWT
  const token = jwt.sign(user, 'seu_segredo', { expiresIn: '1h' });

  // Envie o token como resposta
  res.json({ token });
});


//inicio da implementacao do MOC

// Simulando um array de obras de arte
let obrasDeArte = [];
let id = 0;

// Rota protegida para criar uma obra de arte
app.post('/obra', authenticateToken, (req, res) => {
    const novaObraDeArte = req.body;

    novaObraDeArte.id = id + 1;
    obrasDeArte.push(novaObraDeArte);
    id = id + 1;
    res.status(201).json(novaObraDeArte);
});

// Rota protegida para listar todas as obras de arte
app.get('/obra', authenticateToken, (req, res) => {
    // Recupere os parâmetros de consulta da solicitação
    let { titulo, autor, page, limit, sort } = req.query;

    pageInt = parseInt(page);
    limitInt = parseInt(limit)

    // Clone o array de obras de arte para não afetar o original
    let obrasFiltradas = [...obrasDeArte];

    // Aplicar filtros se os parâmetros de consulta estiverem presentes
    if (titulo) {
        obrasFiltradas = obrasFiltradas.filter(obra => obra.titulo.includes(titulo));
    }
    if (autor) {
        obrasFiltradas = obrasFiltradas.filter(obra => obra.autor.includes(autor));
    }

    // Ordenar obras de arte se a ordenação estiver especificada
    if (sort) {
        const [sortField, sortOrder] = sort.split(':');
        obrasFiltradas = obrasFiltradas.sort((a, b) => {
            if (sortOrder === 'asc') {
                return a[sortField] > b[sortField] ? 1 : -1;
            } else {
                return a[sortField] < b[sortField] ? 1 : -1;
            }
        });
    }

    // Paginação
    let startIndex = 0;
    let endIndex = obrasFiltradas.length;

    if (pageInt && limitInt) {
        startIndex = (pageInt - 1) * limitInt;
        endIndex = Math.min(startIndex + limitInt, obrasFiltradas.length);
    }

    // Mapear as obras de arte filtradas para adicionar links
    const obrasComLinks = obrasFiltradas.slice(startIndex, endIndex).map(obra => {
        return {
            ...obra,
            links: [
                { rel: 'self', href: `/obras-de-arte/${obra.id}`, method:'GET'},
                { rel: 'update', href: `/obras-de-arte/${obra.id}`, method:'PUT' },
                { rel: 'delete', href: `/obras-de-arte/${obra.id}`, method:'DELETE' }
            ]
        };
    });

    // Resto do código para adicionar links HATEOAS

    // Preparar links para HATEOAS
    const links = [];

    if (pageInt > 1) {
        links.push({ rel: 'prev', href: `/obras-de-arte?page=${pageInt - 1}&limit=${limitInt}` });
    }

    if (endIndex < obrasDeArte.length) {
        links.push({ rel: 'next', href: `/obras-de-arte?page=${pageInt + 1}&limit=${limitInt}` });
    }

    // Resto do código para criar a resposta

    // Resposta com metadados e links HATEOAS
    const response = {
        data: obrasComLinks,
        metadata: {
            totalCount: obrasFiltradas.length,
            page: pageInt || 1,
            limit: limitInt || obrasDeArte.length
        },
        links
    };

    res.json(response);
});

// Rota protegida para atualizar uma obra de arte por ID
app.put('/obra/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const obraExistente = obrasDeArte.find(obra => obra.id === parseInt(id));

    if (!obraExistente) {
        return res.status(404).json({ message: 'Obra de arte não encontrada' });
    }

    // Atualize os campos necessários da obra de arte
    const updatedObraDeArte = { ...obraExistente, ...req.body };
    obrasDeArte = obrasDeArte.map(obra => (obra.id === parseInt(id) ? updatedObraDeArte : obra));

    res.json(updatedObraDeArte);
});

// Rota protegida para excluir uma obra de arte por ID
app.delete('/obra/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const obraExistente = obrasDeArte.find(obra => obra.id === parseInt(id));

    if (!obraExistente) {
        return res.status(404).json({ message: 'Obra de arte não encontrada' });
    }

    obrasDeArte = obrasDeArte.filter(obra => obra.id !== parseInt(id));
    res.json({ message: 'Obra de arte excluída com sucesso' });
});

//fim da implementacao do MOC

// Rota Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});