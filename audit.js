const express = require('express');
const { Pool } = require('pg');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// RODO AUDIT ENGINE
class RODOAuditEngine {
  constructor() {
    this.riskFactors = {
      industry: {
        'healthcare': 40,
        'finance': 35,
        'ecommerce': 25,
        'marketing': 30,
        'education': 20,
        'it': 15,
        'other': 20
      },
      employees: {
        '1-10': 10,
        '11-50': 20,
        '51-250': 30,
        '250+': 40
      },
      dataTypes: {
        'health': 30,
        'financial': 25,
        'behavioral': 15,
        'basic': 10
      }
    };
  }

  calculateRiskScore(auditData) {
    let score = 0;
    
    // Industry risk
    score += this.riskFactors.industry[auditData.industry] || 20;
    
    // Employee count risk
    score += this.riskFactors.employees[auditData.employees] || 15;
    
    // Data types risk
    if (auditData.dataTypes && Array.isArray(auditData.dataTypes)) {
      auditData.dataTypes.forEach(type => {
        score += this.riskFactors.dataTypes[type] || 0;
      });
    }
    
    // Policy status
    if (auditData.hasPolicy === 'no') score += 30;
    if (auditData.hasPolicy === 'outdated') score += 20;
    
    return Math.min(score, 100);
  }

  generateRecommendations(auditData) {
    const recommendations = [];
    
    if (auditData.hasPolicy === 'no') {
      recommendations.push({
        title: 'Stwórz politykę prywatności',
        description: 'Brak polityki prywatności to podstawowe naruszenie RODO.',
        priority: 'KRYTYCZNY',
        time: '2-3 dni'
      });
    }

    if (auditData.hasPolicy === 'outdated') {
      recommendations.push({
        title: 'Zaktualizuj politykę prywatności', 
        description: 'Przestarzała polityka może prowadzić do kar.',
        priority: 'WYSOKI',
        time: '1-2 dni'
      });
    }

    recommendations.push({
      title: 'Stwórz rejestr czynności przetwarzania',
      description: 'Obowiązkowy dokument dla firm przetwarzających dane.',
      priority: 'WYSOKI', 
      time: '3-5 dni'
    });

    return recommendations.slice(0, 5);
  }
}

// AUDIT ENDPOINT
router.post('/', [
  body('companyName').notEmpty().trim().escape(),
  body('industry').isIn(['ecommerce', 'healthcare', 'finance', 'education', 'marketing', 'it', 'other']),
  body('employees').isIn(['1-10', '11-50', '51-250', '250+']),
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const auditData = req.body;
    const auditEngine = new RODOAuditEngine();

    // Calculate results
    const riskScore = auditEngine.calculateRiskScore(auditData);
    const recommendations = auditEngine.generateRecommendations(auditData);
    const potentialFines = Math.round((50000 * riskScore / 100) / 1000) * 1000;

    // Send response
    res.json({
      success: true,
      companyName: auditData.companyName,
      riskScore,
      riskLevel: riskScore < 30 ? 'NISKIE' : riskScore < 60 ? 'ŚREDNIE' : 'WYSOKIE',
      recommendations,
      potentialFines,
      message: 'Audyt RODO zakończony pomyślnie'
    });

  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Wystąpił błąd podczas audytu'
    });
  }
});

// HEALTH CHECK dla routes
router.get('/health', (req, res) => {
  res.json({ status: 'Audit routes OK' });
});

module.exports = router;