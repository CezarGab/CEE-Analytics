// Script para montar o chart das métricas na Dashboard.

function gerarBolhasEngajamento(engajamentoPorHorario, postsPorHorario, engajamentoTotal, bolhas){
  engajamentoPorHorario.forEach(function(engajamento, horario){ // iterador = horario
    var bolha = new Object();
    bolha.x = horario;
    bolha.y = engajamento;
    bolha.z = postsPorHorario[horario];  
    var porcentagem = engajamento/engajamentoTotal;

    bolhas[getClassificacaoEngajamento(porcentagem)].data.push(bolha); // Colore a bolha de acordo com a classificacao e adiciona ao grafico
  })
  return bolhas;
}

function getClassificacaoEngajamento(participacaoEmPorcentagem){
  if (participacaoEmPorcentagem > 0.1){
    return 0;
  }
  else if (participacaoEmPorcentagem > 0.05){
    return 1;
  }
  else if (participacaoEmPorcentagem > 0.03){
    return 2;
  }
  else{
    return 3;
  }
}

function generateBubbleGraph(engajamentoPorHorario, postsPorHorario, engajamentoTotal){
  var seriesBubbles = [{
      name: 'Alto engajamento',
      data: [],
    },
    {
      name: 'Médio engajamento',
      data: [],
    },
    {
      name: 'Baixo engajamento',
      data: [],
    },
    {
      name: 'Engajamento mínimo',
      data: [],
  }]
  

  gerarBolhasEngajamento(engajamentoPorHorario, postsPorHorario, engajamentoTotal, seriesBubbles);
 
  var engajamentoMax = engajamentoPorHorario.reduce(function(a, b) {
    return Math.max(a, b);
  });
  
  var options = {
      series: seriesBubbles,

      chart: {
        height: 500,
        type: 'bubble',
    },
    dataLabels: {
        enabled: false
    },
    fill: {
        opacity: 0.8
    },
    title: {
        text: 'Engajamento acumulado por faixa de horários'
    },
    xaxis: {
        tickAmount: 12,
        type: 'category',      
    },
    yaxis: {
        max: engajamentoMax // maximiza de acordo com o valor mais alto de engajamento
    },
    tooltip: {
      x: {
        formatter: (seriesName) => 'Faixa: ' + seriesName + 'h'
      },
      y: {
        formatter: undefined,
        title: {
          formatter: (seriesName) => 'Engajamento acumulado: ',
        }
      },
      z: {
        title: 'Qtd. de posts: '
      }
    },
    noData: {
      text: 'Carregando...'
    }
  };

  chartEngajamentoPorHorario = new ApexCharts(document.querySelector("#chart"), options);
  chartEngajamentoPorHorario.render();
}