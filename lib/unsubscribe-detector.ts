import { createClient } from '@/lib/supabase/server';

export interface UnsubscribeLink {
  type: 'link' | 'mailto' | 'list_unsubscribe';
  url: string;
  text?: string;
  method?: 'GET' | 'POST';
  isListUnsubscribe?: boolean;
}

export interface UnsubscribeCandidate {
  emailId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  unsubscribeLinks: UnsubscribeLink[];
  confidence: 'high' | 'medium' | 'low';
  category: 'newsletter' | 'promotional' | 'transactional' | 'social' | 'other';
  domain: string;
}

export interface UnsubscribeHistory {
  id: string;
  user_id: string;
  email_id: string;
  sender_domain: string;
  sender_email: string;
  unsubscribe_method: string;
  success: boolean;
  attempted_at: string;
  confirmed_at?: string;
  error_message?: string;
}

export class UnsubscribeDetector {
  private commonUnsubscribePatterns = [
    // English patterns
    /unsubscribe/i,
    /opt[- ]?out/i,
    /remove[- ]?me/i,
    /stop[- ]?emails/i,
    /manage[- ]?subscription/i,
    /email[- ]?preferences/i,
    /notification[- ]?settings/i,
    /update[- ]?preferences/i,
    /turn[- ]?off/i,
    /disable[- ]?notifications/i,
    /cancel[- ]?subscription/i,
    /leave[- ]?list/i,
    /withdraw/i,
    
    // Spanish patterns
    /cancelar[- ]?suscripción/i,
    /darse[- ]?de[- ]?baja/i,
    /anular[- ]?suscripción/i,
    /eliminar[- ]?suscripción/i,
    /no[- ]?recibir[- ]?más/i,
    /dejar[- ]?de[- ]?recibir/i,
    /preferencias[- ]?de[- ]?correo/i,
    
    // French patterns
    /se[- ]?désabonner/i,
    /désinscrire/i,
    /annuler[- ]?abonnement/i,
    /ne[- ]?plus[- ]?recevoir/i,
    /préférences[- ]?email/i,
    /gestion[- ]?des[- ]?emails/i,
    
    // German patterns
    /abbestellen/i,
    /abmelden/i,
    /kündigen/i,
    /newsletter[- ]?abbestellen/i,
    /email[- ]?einstellungen/i,
    /benachrichtigungen[- ]?deaktivieren/i,
    
    // Italian patterns
    /cancellare[- ]?iscrizione/i,
    /disiscriversi/i,
    /annullare[- ]?abbonamento/i,
    /non[- ]?ricevere[- ]?più/i,
    /preferenze[- ]?email/i,
    
    // Portuguese patterns
    /cancelar[- ]?inscrição/i,
    /descadastrar/i,
    /sair[- ]?da[- ]?lista/i,
    /não[- ]?receber[- ]?mais/i,
    /preferências[- ]?de[- ]?email/i,
    
    // Dutch patterns
    /uitschrijven/i,
    /afmelden/i,
    /opzeggen/i,
    /email[- ]?voorkeuren/i,
    
    // Danish patterns
    /afmelde/i,
    /framelde/i,
    /opsige/i,
    /stoppe[- ]?abonnement/i,
    /email[- ]?indstillinger/i,
    /nyhedsbrev[- ]?afmelding/i,
    /ikke[- ]?modtage[- ]?flere/i,
    /præferencer/i,
    /administrere[- ]?abonnement/i,
    
    // Norwegian patterns
    /melde[- ]?av/i,
    /avmelde/i,
    /si[- ]?opp/i,
    /stoppe[- ]?abonnement/i,
    /email[- ]?innstillinger/i,
    /nyhetsbrev[- ]?avmelding/i,
    /ikke[- ]?motta[- ]?flere/i,
    
    // Swedish patterns
    /avregistrera/i,
    /avsluta[- ]?prenumeration/i,
    /säga[- ]?upp/i,
    /sluta[- ]?få[- ]?email/i,
    /email[- ]?inställningar/i,
    /nyhetsbrev[- ]?avregistrering/i,
    /inte[- ]?få[- ]?fler/i,
    
    // Japanese patterns (romanized)
    /kaijo/i,          // 解除 (cancellation)
    /teishi/i,         // 停止 (stop)
    /haitatsu[- ]?teishi/i, // 配達停止 (stop delivery)
    
    // Chinese patterns (simplified/traditional romanized)
    /tuiding/i,        // 退订 (unsubscribe)
    /quxiao/i,         // 取消 (cancel)
    /tingzhi/i,        // 停止 (stop)
    
    // Korean patterns (romanized)
    /gusokchwiso/i,    // 구독취소 (cancel subscription)
    /susinjeongji/i,   // 수신정지 (stop receiving)
    
    // Russian patterns (romanized)
    /otpisatsya/i,     // отписаться (unsubscribe)
    /otmenit/i,        // отменить (cancel)
    
    // Arabic patterns (romanized)
    /ilgha[- ]?al[- ]?ishtirak/i, // إلغاء الاشتراك (cancel subscription)
    
    // Common URL patterns regardless of language
    /unsub/i,
    /optout/i,
    /remove/i,
    /leave/i,
    /stop/i,
    /cancel/i,
    /delete/i,
    /quit/i,
    /off/i,
    /out/i,
  ];

  private promotionalKeywords = [
    'sale', 'deal', 'offer', 'discount', '% off', 'shop now', 'limited time',
    'exclusive', 'promo', 'coupon', 'free shipping', 'buy now', 'special offer'
  ];

  private newsletterKeywords = [
    'newsletter', 'weekly', 'monthly', 'digest', 'update', 'news',
    'bulletin', 'report', 'summary', 'roundup'
  ];

  private socialKeywords = [
    'notification', 'activity', 'mention', 'tag', 'comment', 'like',
    'follow', 'friend request', 'message'
  ];

  /**
   * Detect unsubscribe opportunities in email content
   */
  async detectUnsubscribeOpportunities(
    emailId: string,
    subject: string,
    from: string,
    date: string,
    snippet: string,
    fullContent?: string
  ): Promise<UnsubscribeCandidate | null> {
    const content = fullContent || snippet;
    const unsubscribeLinks = this.extractUnsubscribeLinks(content);
    
    if (unsubscribeLinks.length === 0) {
      return null;
    }

    const domain = this.extractDomain(from);
    const category = this.categorizeEmail(subject, from, content);
    const confidence = this.calculateConfidence(unsubscribeLinks, category, from);

    return {
      emailId,
      subject,
      from,
      date,
      snippet,
      unsubscribeLinks,
      confidence,
      category,
      domain,
    };
  }

  private unicodeUnsubscribePatterns = [
    // Japanese
    /解除/g,
    /停止/g,
    /配達停止/g,
    /登録解除/g,
    /購読停止/g,
    
    // Chinese (Simplified)
    /退订/g,
    /取消/g,
    /停止/g,
    /取消订阅/g,
    /退出/g,
    
    // Chinese (Traditional)
    /退訂/g,
    /取消/g,
    /停止/g,
    /取消訂閱/g,
    /退出/g,
    
    // Korean
    /구독취소/g,
    /수신정지/g,
    /탈퇴/g,
    /해지/g,
    
    // Russian
    /отписаться/g,
    /отменить/g,
    /прекратить/g,
    /удалить/g,
    /отказаться/g,
    
    // Arabic
    /إلغاء الاشتراك/g,
    /إلغاء/g,
    /توقف/g,
    /حذف/g,
    
    // Hebrew
    /ביטול מנוי/g,
    /ביטול/g,
    /הסרה/g,
    
    // Hindi (Devanagari)
    /सदस्यता रद्द/g,
    /रद्द करें/g,
    /बंद करें/g,
    
    // Thai
    /ยกเลิกการสมัคร/g,
    /ยกเลิก/g,
    /หยุด/g,
    
    // Vietnamese
    /hủy đăng ký/g,
    /hủy bỏ/g,
    /dừng/g,
  ];

  /**
   * Extract unsubscribe links from email content
   */
  private extractUnsubscribeLinks(content: string): UnsubscribeLink[] {
    const links: UnsubscribeLink[] = [];
    
    // Extract HTTP/HTTPS links that contain unsubscribe patterns
    const httpLinkRegex = /https?:\/\/[^\s<>"]+/gi;
    const httpMatches = content.match(httpLinkRegex) || [];
    
    for (const url of httpMatches) {
      if (this.commonUnsubscribePatterns.some(pattern => pattern.test(url))) {
        links.push({
          type: 'link',
          url: url,
          method: 'GET'
        });
      }
    }

    // Also check for links near Unicode unsubscribe text
    for (const pattern of this.unicodeUnsubscribePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        // Look for links within 200 characters of Unicode unsubscribe text
        const patternIndex = content.search(pattern);
        if (patternIndex !== -1) {
          const contextStart = Math.max(0, patternIndex - 100);
          const contextEnd = Math.min(content.length, patternIndex + 100);
          const context = content.substring(contextStart, contextEnd);
          
          const contextLinks = context.match(httpLinkRegex) || [];
          for (const contextUrl of contextLinks) {
            if (!links.some(link => link.url === contextUrl)) {
              links.push({
                type: 'link',
                url: contextUrl,
                method: 'GET'
              });
            }
          }
        }
      }
    }

    // Extract mailto links
    const mailtoRegex = /mailto:([^\s<>"?]+)(?:\?([^"]*?))?/gi;
    let mailtoMatch;
    while ((mailtoMatch = mailtoRegex.exec(content)) !== null) {
      const email = mailtoMatch[1];
      const params = mailtoMatch[2];
      
      if (this.commonUnsubscribePatterns.some(pattern => 
        pattern.test(email) || (params && pattern.test(params))
      )) {
        links.push({
          type: 'mailto',
          url: mailtoMatch[0]
        });
      }
    }

    // Look for List-Unsubscribe header references
    const listUnsubscribeRegex = /list-unsubscribe[:\s]+<?([^>]+)>?/gi;
    let listMatch;
    while ((listMatch = listUnsubscribeRegex.exec(content)) !== null) {
      links.push({
        type: 'list_unsubscribe',
        url: listMatch[1].trim(),
        isListUnsubscribe: true
      });
    }

    // Look for unsubscribe text with surrounding context (Latin script)
    const textLinkRegex = /<a[^>]*href=["']([^"']*?)["'][^>]*>([^<]*unsubscribe[^<]*)<\/a>/gi;
    let textMatch;
    while ((textMatch = textLinkRegex.exec(content)) !== null) {
      if (!links.some(link => link.url === textMatch[1])) {
        links.push({
          type: 'link',
          url: textMatch[1],
          text: textMatch[2].trim(),
          method: 'GET'
        });
      }
    }

    // Look for Unicode unsubscribe text in links
    for (const pattern of this.unicodeUnsubscribePatterns) {
      const unicodeTextRegex = new RegExp(`<a[^>]*href=["']([^"']*?)["'][^>]*>([^<]*${pattern.source}[^<]*)<\/a>`, 'gi');
      let unicodeMatch;
      while ((unicodeMatch = unicodeTextRegex.exec(content)) !== null) {
        if (!links.some(link => link.url === unicodeMatch[1])) {
          links.push({
            type: 'link',
            url: unicodeMatch[1],
            text: unicodeMatch[2].trim(),
            method: 'GET'
          });
        }
      }
    }

    // Also check for common unsubscribe patterns in other languages
    for (const pattern of this.commonUnsubscribePatterns) {
      const langTextRegex = new RegExp(`<a[^>]*href=["']([^"']*?)["'][^>]*>([^<]*${pattern.source}[^<]*)<\/a>`, 'gi');
      let langMatch;
      while ((langMatch = langTextRegex.exec(content)) !== null) {
        if (!links.some(link => link.url === langMatch[1])) {
          links.push({
            type: 'link',
            url: langMatch[1],
            text: langMatch[2].trim(),
            method: 'GET'
          });
        }
      }
    }

    return links;
  }

  /**
   * Categorize email type for better unsubscribe handling
   */
  private categorizeEmail(subject: string, from: string, content: string): string {
    const text = `${subject} ${from} ${content}`.toLowerCase();

    if (this.promotionalKeywords.some(keyword => text.includes(keyword))) {
      return 'promotional';
    }

    if (this.newsletterKeywords.some(keyword => text.includes(keyword))) {
      return 'newsletter';
    }

    if (this.socialKeywords.some(keyword => text.includes(keyword))) {
      return 'social';
    }

    if (text.includes('receipt') || text.includes('invoice') || text.includes('payment')) {
      return 'transactional';
    }

    return 'other';
  }

  /**
   * Calculate confidence level for unsubscribe success
   */
  private calculateConfidence(
    links: UnsubscribeLink[],
    category: string,
    from: string
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // List-Unsubscribe header presence (RFC compliant)
    if (links.some(link => link.isListUnsubscribe)) {
      score += 3;
    }

    // Multiple unsubscribe methods
    if (links.length > 1) {
      score += 2;
    }

    // Category-based scoring
    if (category === 'newsletter' || category === 'promotional') {
      score += 2;
    } else if (category === 'social') {
      score += 1;
    }

    // Reputable domains
    const domain = this.extractDomain(from);
    const reputableDomains = [
      'mailchimp.com', 'constantcontact.com', 'sendgrid.net',
      'amazon.com', 'google.com', 'microsoft.com', 'apple.com',
      'linkedin.com', 'facebook.com', 'twitter.com'
    ];

    if (reputableDomains.some(repDomain => domain.includes(repDomain))) {
      score += 2;
    }

    // HTTPS links (more secure)
    if (links.some(link => link.url.startsWith('https://'))) {
      score += 1;
    }

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Extract domain from email address
   */
  private extractDomain(email: string): string {
    const match = email.match(/@([^>\s]+)/);
    return match ? match[1].toLowerCase() : '';
  }

  /**
   * Get unsubscribe history for analysis
   */
  async getUnsubscribeHistory(userId: string, domain?: string): Promise<UnsubscribeHistory[]> {
    const supabase = createClient();
    
    let query = supabase
      .from('unsubscribe_history')
      .select('*')
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false });

    if (domain) {
      query = query.eq('sender_domain', domain);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching unsubscribe history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Record unsubscribe attempt
   */
  async recordUnsubscribeAttempt(
    userId: string,
    emailId: string,
    senderEmail: string,
    method: string,
    success: boolean,
    errorMessage?: string
  ): Promise<string | null> {
    const supabase = createClient();
    
    const domain = this.extractDomain(senderEmail);
    
    const { data, error } = await supabase
      .from('unsubscribe_history')
      .insert({
        user_id: userId,
        email_id: emailId,
        sender_domain: domain,
        sender_email: senderEmail,
        unsubscribe_method: method,
        success,
        error_message: errorMessage,
        attempted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording unsubscribe attempt:', error);
      return null;
    }

    return data.id;
  }

  /**
   * Update unsubscribe confirmation
   */
  async confirmUnsubscribe(historyId: string): Promise<boolean> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('unsubscribe_history')
      .update({
        success: true,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', historyId);

    if (error) {
      console.error('Error confirming unsubscribe:', error);
      return false;
    }

    return true;
  }

  /**
   * Get unsubscribe statistics
   */
  async getUnsubscribeStats(userId: string): Promise<{
    totalAttempts: number;
    successfulUnsubscribes: number;
    topDomains: Array<{ domain: string; count: number; successRate: number }>;
    recentActivity: UnsubscribeHistory[];
  }> {
    const history = await this.getUnsubscribeHistory(userId);
    
    const totalAttempts = history.length;
    const successfulUnsubscribes = history.filter(h => h.success).length;

    // Calculate domain statistics
    const domainStats = new Map<string, { total: number; successful: number }>();
    
    for (const record of history) {
      const current = domainStats.get(record.sender_domain) || { total: 0, successful: 0 };
      current.total++;
      if (record.success) current.successful++;
      domainStats.set(record.sender_domain, current);
    }

    const topDomains = Array.from(domainStats.entries())
      .map(([domain, stats]) => ({
        domain,
        count: stats.total,
        successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentActivity = history.slice(0, 20);

    return {
      totalAttempts,
      successfulUnsubscribes,
      topDomains,
      recentActivity,
    };
  }
}