const ultralightbeam = require('./ultralightbeam')
const riftpactforgeInfo = require('../../')
const riftpactInfo = require('riftpact')
const oathforgeInfo = require('oathforge')
const Amorph = require('amorph')
const amorphNumber = require('amorph-number')
const accounts = require('./accounts')
const FailedTransactionError = require('ultralightbeam/lib/errors/FailedTransaction')
const getRandomAmorph = require('ultralightbeam/lib/getRandomAmorph')
const amorphAscii = require('amorph-ascii')
const chai = require('chai')
const amorphBoolean = require('amorph-boolean')
const SolWrapper = require('ultralightbeam/lib/SolWrapper')

const amorphTrue = Amorph.from(amorphBoolean, true)
const amorphFalse = Amorph.from(amorphBoolean, false)

let oathforge
let riftpactforge

describe('oathforge', () => {
  const name = Amorph.from(amorphAscii, 'oathforge')
  const symbol = Amorph.from(amorphAscii, 'OAT')

  it('should setup', () => {
    return ultralightbeam.solDeploy(oathforgeInfo.code, oathforgeInfo.abi, [
      name,
      symbol
    ], {
      from: accounts[0]
    }).then((_oathforge) => {
      oathforge = _oathforge
    })
  })

  it('should mint oathforgetoken #0', () => {
    const uri = Amorph.from(amorphAscii, 'uri')
    const sunsetLength = Amorph.from(amorphNumber.unsigned, 60 * 60 * 24 * 90)
    return oathforge.broadcast('mint(address,string,uint256)', [
      accounts[1].address,
      uri,
      sunsetLength
    ], {
      from: accounts[0]
    }).getConfirmation()
  })

  it('should mint oathforgetoken #1', () => {
    const uri = Amorph.from(amorphAscii, 'uri')
    const sunsetLength = Amorph.from(amorphNumber.unsigned, 60 * 60 * 24 * 90)
    return oathforge.broadcast('mint(address,string,uint256)', [
      accounts[1].address,
      uri,
      sunsetLength
    ], {
      from: accounts[0]
    }).getConfirmation()
  })
})

describe('riftpactforge', () => {

  it('should set up riftpactforge', () => {
    return ultralightbeam.solDeploy(riftpactforgeInfo.code, riftpactforgeInfo.abi, [
      oathforge.address
    ], {
      from: accounts[0]
    }).then((_riftpactforge) => {
      riftpactforge = _riftpactforge
    })
  })
  describe('change minter', () => {
    it('should fail from accounts[1]', () => {
      return riftpactforge.broadcast('setMinter(address)', [accounts[2].address], {
        from: accounts[1]
      }).getConfirmation().should.be.rejectedWith(FailedTransactionError)
    })
    it('should succeed from accounts[0]', () => {
      return riftpactforge.broadcast('setMinter(address)', [accounts[2].address], {
        from: accounts[0]
      }).getConfirmation().then(() => {
        return riftpactforge.fetch('minter()', []).should.eventually.amorphEqual(accounts[2].address)
      })
    })
  })
  describe('mint 0', () => {
    const tokenId = Amorph.from(amorphNumber.unsigned, 0)
    const totalSupply = getRandomAmorph(32)
    const currency = getRandomAmorph(20)
    const auctionAllowedAt = getRandomAmorph(32)
    const minAuctionCompleteWait = getRandomAmorph(32)
    const minBidDeltaPermille = getRandomAmorph(32)

    let riftpact

    it('should fail to mint from accounts[0]', () => {
      return riftpactforge.broadcast('mint(address,uint256,uint256,address,uint256,uint256,uint256)', [
        accounts[1].address,
        tokenId,
        totalSupply,
        currency,
        auctionAllowedAt,
        minAuctionCompleteWait,
        minBidDeltaPermille
      ], {
        from: accounts[0]
      }).getConfirmation().should.eventually.be.rejectedWith(FailedTransactionError)
    })
    it('should fail to mint from accounts[2] (not approved by account[1])', () => {
      return riftpactforge.broadcast('mint(address,uint256,uint256,address,uint256,uint256,uint256)', [
        accounts[1].address,
        tokenId,
        totalSupply,
        currency,
        auctionAllowedAt,
        minAuctionCompleteWait,
        minBidDeltaPermille
      ], {
        from: accounts[2]
      }).getConfirmation().should.eventually.be.rejectedWith(FailedTransactionError)
    })
    it('accounts[1] should approve riftpactforge', () => {
      return oathforge.broadcast('setApprovalForAll(address,bool)', [
        riftpactforge.address,
        amorphTrue,
      ], {
        from: accounts[1]
      }).getConfirmation()
    })
    it('should mint', () => {
      return riftpactforge.broadcast('mint(address,uint256,uint256,address,uint256,uint256,uint256)', [
        accounts[1].address,
        tokenId,
        totalSupply,
        currency,
        auctionAllowedAt,
        minAuctionCompleteWait,
        minBidDeltaPermille
      ], {
        from: accounts[2]
      }).getConfirmation()
    })
    it('riftpactforge should have rftsCount of 1', () => {
      return riftpactforge.fetch('rftsCount()', []).should.eventually.amorphEqual(Amorph.from(amorphNumber.unsigned, 1))
    })
    it('get riftpact', () => {
      return riftpactforge.fetch('rfts(uint256)', [tokenId]).then((riftpactAddress) => {
        riftpact = new SolWrapper(ultralightbeam, riftpactInfo.abi, riftpactAddress)
      })
    })
    it('oathforge#0 owner should be riftpact', () => {
      return oathforge.fetch('ownerOf(uint256)', [tokenId]).should.eventually.amorphEqual(riftpact.address)
    })
    it('accounts[1] should have all rft tokens', () => {
      return riftpact.fetch('balanceOf(address)', [accounts[1].address]).should.eventually.amorphEqual(totalSupply)
    })
    it('riftpact should have correct variables', () => {
      return riftpact.fetch('owner()', []).should.eventually.amorphEqual(riftpactforge.address).then(() => {
        return riftpact.fetch('parentToken()', []).should.eventually.amorphEqual(oathforge.address)
      }).then(() => {
        return riftpact.fetch('parentTokenId()', []).should.eventually.amorphEqual(tokenId)
      }).then(() => {
        return riftpact.fetch('totalSupply()', []).should.eventually.amorphEqual(totalSupply)
      }).then(() => {
        return riftpact.fetch('currencyAddress()', []).should.eventually.amorphEqual(currency)
      }).then(() => {
        return riftpact.fetch('auctionAllowedAt()', []).should.eventually.amorphEqual(auctionAllowedAt)
      }).then(() => {
        return riftpact.fetch('minAuctionCompleteWait()', []).should.eventually.amorphEqual(minAuctionCompleteWait)
      }).then(() => {
        return riftpact.fetch('minBidDeltaPermille()', []).should.eventually.amorphEqual(minBidDeltaPermille)
      })
    })

    describe('blacklist', () => {
      it('account[1] should not be able to blacklist', () => {
        return riftpactforge.broadcast('setIsBlacklisted(address,address,bool)', [
          riftpact.address,
          accounts[4].address,
          amorphTrue
        ], {
          from: accounts[1]
        }).getConfirmation().should.eventually.be.rejectedWith(FailedTransactionError)
      })
      it('account[0] should not be able to blacklist', () => {
        return riftpactforge.broadcast('setIsBlacklisted(address,address,bool)', [
          riftpact.address,
          accounts[4].address,
          amorphTrue
        ], {
          from: accounts[0]
        }).getConfirmation().then(() => {
          return riftpact.fetch('isBlacklisted(address)', [accounts[4].address]).should.eventually.amorphEqual(amorphTrue)
        })
      })
    })
  })

  describe('mint 1', () => {
    const tokenId = Amorph.from(amorphNumber.unsigned, 1)
    const totalSupply = getRandomAmorph(32)
    const currency = getRandomAmorph(20)
    const auctionAllowedAt = getRandomAmorph(32)
    const minAuctionCompleteWait = getRandomAmorph(32)
    const minBidDeltaPermille = getRandomAmorph(32)

    let riftpact

    it('should fail to pause riftpactforge from accounts[1]', () => {
      return riftpactforge.broadcast('setIsPaused(bool)', [amorphTrue], {
        from: accounts[1]
      }).getConfirmation().should.eventually.be.rejectedWith(FailedTransactionError)
    })

    it('should pause riftpactforge', () => {
      return riftpactforge.broadcast('setIsPaused(bool)', [amorphTrue], {
        from: accounts[0]
      }).getConfirmation().then(() => {
        return riftpactforge.fetch('isPaused()', []).should.eventually.amorphEqual(amorphTrue)
      })
    })

    it('should fail to mint from accounts[1] (paused)', () => {
      return riftpactforge.broadcast('mint(address,uint256,uint256,address,uint256,uint256,uint256)', [
        accounts[1].address,
        tokenId,
        totalSupply,
        currency,
        auctionAllowedAt,
        minAuctionCompleteWait,
        minBidDeltaPermille
      ], {
        from: accounts[1]
      }).getConfirmation().should.eventually.be.rejectedWith(FailedTransactionError)
    })

    it('should un-pause riftpactforge', () => {
      return riftpactforge.broadcast('setIsPaused(bool)', [amorphFalse], {
        from: accounts[0]
      }).getConfirmation().then(() => {
        return riftpactforge.fetch('isPaused()', []).should.eventually.amorphEqual(amorphFalse)
      })
    })

    it('should mint', () => {
      return riftpactforge.broadcast('mint(address,uint256,uint256,address,uint256,uint256,uint256)', [
        accounts[1].address,
        tokenId,
        totalSupply,
        currency,
        auctionAllowedAt,
        minAuctionCompleteWait,
        minBidDeltaPermille
      ], {
        from: accounts[2]
      }).getConfirmation()
    })
    it('riftpactforge should have rftsCount of 2', () => {
      return riftpactforge.fetch('rftsCount()', []).should.eventually.amorphEqual(Amorph.from(amorphNumber.unsigned, 2))
    })
    it('get riftpact', () => {
      return riftpactforge.fetch('rfts(uint256)', [tokenId]).then((riftpactAddress) => {
        riftpact = new SolWrapper(ultralightbeam, riftpactInfo.abi, riftpactAddress)
      })
    })
    it('oathforge#0 owner should be riftpact', () => {
      return oathforge.fetch('ownerOf(uint256)', [tokenId]).should.eventually.amorphEqual(riftpact.address)
    })
    it('accounts[1] should have all rft tokens', () => {
      return riftpact.fetch('balanceOf(address)', [accounts[1].address]).should.eventually.amorphEqual(totalSupply)
    })
    it('riftpact should have correct variables', () => {
      return riftpact.fetch('owner()', []).should.eventually.amorphEqual(riftpactforge.address).then(() => {
        return riftpact.fetch('parentToken()', []).should.eventually.amorphEqual(oathforge.address)
      }).then(() => {
        return riftpact.fetch('parentTokenId()', []).should.eventually.amorphEqual(tokenId)
      }).then(() => {
        return riftpact.fetch('totalSupply()', []).should.eventually.amorphEqual(totalSupply)
      }).then(() => {
        return riftpact.fetch('currencyAddress()', []).should.eventually.amorphEqual(currency)
      }).then(() => {
        return riftpact.fetch('auctionAllowedAt()', []).should.eventually.amorphEqual(auctionAllowedAt)
      }).then(() => {
        return riftpact.fetch('minAuctionCompleteWait()', []).should.eventually.amorphEqual(minAuctionCompleteWait)
      }).then(() => {
        return riftpact.fetch('minBidDeltaPermille()', []).should.eventually.amorphEqual(minBidDeltaPermille)
      })
    })
  })
})
