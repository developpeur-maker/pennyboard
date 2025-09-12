module.exports = (req, res) => {
  res.status(200).json({
    message: 'API Vercel fonctionne !',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  })
}
