import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,

    Platform,
    Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Sun, AlertTriangle, BarChart2, Users, Shield, Cloud, CheckCircle, Microscope, Landmark, GraduationCap, Search, X, ArrowLeft, BookOpen, ExternalLink } from 'lucide-react-native';

const IconMap = {
    '1': Sun,
    '2': AlertTriangle,
    '3': BarChart2,
    '4': Users,
    '5': Shield,
    '6': Cloud,
    '7': CheckCircle,
    '8': Microscope,
    '9': Landmark,
    '10': GraduationCap,
    '11': BookOpen
};

// Comprehensive educational content
const LEARN_SECTIONS = [
    {
        id: 1,
        title: 'What is Vitamin D?',
        content: `Vitamin D is a fat-soluble vitamin crucial for many bodily functions:

• Bone Health: Helps absorb calcium and phosphorus for strong bones and teeth
• Immune System: Supports immune cell function and reduces infection risk
• Brain Function: May help regulate mood and reduce depression
• Heart Health: Linked to reduced cardiovascular disease risk
• Muscle Function: Essential for muscle strength and coordination

Our bodies produce Vitamin D when UVB rays hit cholesterol in skin cells. Just 10-30 minutes of midday sun several times per week can help maintain healthy levels (1000-4000 IU daily).

Deficiency symptoms: Fatigue, bone pain, muscle weakness, mood changes, frequent illness`
    },
    {
        id: 2,
        title: 'Why Deficiency is So Common?',
        content: `Approximately 1 billion people worldwide have Vitamin D deficiency. Here's why:

• Indoor Lifestyles: Average person spends 90% of time indoors
• Urban Living: Tall buildings block sunlight
• Geography: People living >37° latitude get insufficient UVB in winter
• Age: Skin's ability to synthesize Vitamin D decreases 75% between ages 20-70
• Skin Tone: Melanin acts as natural sunscreen - darker skin needs 3-5x more sun
• Sunscreen: SPF 30 reduces Vitamin D production by 95-98%
• Diet: Few foods naturally contain Vitamin D (fatty fish, egg yolks, fortified foods)
• Obesity: Vitamin D stored in fat tissue, less bioavailable

Modern problem: Our ancestors got plenty of sun through outdoor work/activities`
    },
    {
        id: 3,
        title: 'UV Index Deep Dive',
        content: `The UV Index is an international standard developed by WHO to measure solar ultraviolet radiation intensity:

0-2 (Low): Minimal risk
• Safe for most people
• Wear sunglasses on bright days
• Snow/water reflection can increase exposure

3-5 (Moderate): Low to moderate risk
• Seek shade during midday (10 AM - 4 PM)
• Wear sun protective clothing
• Use SPF 30+ sunscreen on exposed skin

6-7 (High): High risk of harm
• Reduce sun exposure 10 AM - 4 PM
• Protective clothing essential (hat, sunglasses, long sleeves)
• SPF 30+ sunscreen every 2 hours
• Seek shade whenever possible

8-10 (Very High): Very high risk
• Minimize sun exposure during midday hours
• Protective clothing + SPF 50+ mandatory
• Seek shade - UV damage occurs quickly
• White sand/water can double exposure

11+ (Extreme): Extreme risk
• Avoid sun exposure 10 AM - 4 PM if possible
• Seek shade at all times
• Shirt, hat, sunglasses required outdoors
• Apply SPF 50+ sunscreen every 80 minutes
• Common at high altitudes and near equator

UV Index varies by: latitude, time of day, season, cloud cover, altitude, ozone layer`
    },
    {
        id: 4,
        title: 'Fitzpatrick Skin Classification Scale',
        content: `Developed by dermatologist Thomas B. Fitzpatrick in 1975, this scale classifies skin's response to sun exposure:

TYPE I - Very Fair/Pale
• Characteristics: Very pale, often freckles, red/blonde hair, blue/green eyes
• Tanning: Never tans, always burns
• Ethnicity: Celtic descent (Irish, Scottish)
• Burn Time (UV 7): 10-15 minutes
• D Production: Fastest (needs least sun)

TYPE II - Fair
• Characteristics: Fair skin, often freckles, blonde/light brown hair, blue/hazel eyes
• Tanning: Minimal tan, usually burns
• Ethnicity: Northern European
• Burn Time (UV 7): 15-20 minutes
• D Production: Fast

TYPE III - Medium
• Characteristics: Fair to beige skin, brown hair, brown eyes
• Tanning: Gradual, even tan, sometimes burns
• Ethnicity: Mixed European
• Burn Time (UV 7): 25-30 minutes
• D Production: Moderate

TYPE IV - Olive
• Characteristics: Olive/light brown skin, dark brown hair/eyes
• Tanning: Tans easily, rarely burns
• Ethnicity: Mediterranean, Asian, Hispanic
• Burn Time (UV 7): 40-45 minutes
• D Production: Slower (needs more sun)

TYPE V - Brown
• Characteristics: Brown skin, dark hair/eyes
• Tanning: Darkens easily, very rarely burns
• Ethnicity: Middle Eastern, Latin American, South Asian
• Burn Time (UV 7): 60-75 minutes
• D Production: Much slower (needs significantly more sun)

TYPE VI - Dark Brown/Black
• Characteristics: Very dark brown to black skin
• Tanning: Deeply pigmented, never burns (but still sun damage possible!)
• Ethnicity: African, Aboriginal Australian
• Burn Time (UV 7): 90+ minutes
• D Production: Slowest (needs 3-5x more sun than Type I)

Important: ALL skin types can develop skin cancer - darker skin just has more natural protection`
    },
    {
        id: 5,
        title: 'SPF & Sunscreen Science',
        content: `Sun Protection Factor (SPF) measures protection against UVB radiation:

SPF Numbers Explained:
• SPF 15: Blocks 93% of UVB rays (allows 7% through)
• SPF 30: Blocks 97% of UVB rays (allows 3% through)
• SPF 50: Blocks 98% of UVB rays (allows 2% through)
• SPF 100: Blocks 99% of UVB rays (allows 1% through)

Calculation: SPF 30 means you can stay in sun 30x longer before burning
Example: If you burn in 10 minutes → SPF 30 = 300 minutes (5 hours)

Reality Check:
Most people apply only 25-50% of recommended amount (2mg/cm²)
This reduces SPF 30 to effective SPF 8-10!

Application Tips:
• Adult needs ~1 ounce (shot glass) for full body
• Apply 15-30 minutes before sun exposure
• Reapply every 2 hours or after swimming/sweating
• Don't forget: ears, neck, tops of feet, hands

Water Resistance:
• "Water resistant (40 min)": Maintains SPF for 40 min in water
• "Water resistant (80 min)": Maintains SPF for 80 min in water
• Still reapply after swimming!

Types:
Physical/Mineral (Zinc Oxide, Titanium Dioxide): Reflects UV rays, works immediately
Chemical (Avobenzone, Oxybenzone): Absorbs UV rays, needs 15-30 min to activate

Broad Spectrum: Protects against both UVA (aging) and UVB (burning)`
    },
    {
        id: 6,
        title: 'Cloud & Weather Myths',
        content: `MYTH: Cloudy days mean no UV exposure
FACT: Up to 80% of UV rays penetrate light cloud cover
• Thin clouds: 70-90% UV penetration
• Thick clouds: 30-70% UV penetration
• You can still burn on overcast days!

MYTH: You can't get sunburned in winter
FACT: UV rays are present year-round
• Snow reflects up to 80% of UV radiation (vs. sand 15%, water 25%)
• High altitudes: UV increases 10-12% per 1,000m elevation
• Popular ski destinations have extreme UV levels

MYTH: Darker skin doesn't need sun protection
FACT: All skin types need protection from prolonged exposure
• Melanin provides ~SPF 13 protection
• Skin cancer can occur in all skin types
• Melanoma often goes undetected longer in darker skin

MYTH: Sunscreen completely blocks Vitamin D production
FACT: Even SPF 50 allows some UVB through
• Most people don't apply enough for full SPF protection
• Brief unprotected exposure still possible
• Consider: 10-15 min unprotected early morning, then apply sunscreen`
    },
    {
        id: 7,
        title: 'Safe Sun Exposure Guide',
        content: `Best Times:
• 10 AM - 3 PM: Maximum UVB for Vitamin D (but also highest burn risk!)
• Early morning (before 10 AM): Gentler sun but less UVB
• Late afternoon (after 3 PM): Minimal UVB, mostly UVA

Exposure Strategy:
1. Start conservatively: 5-10 minutes for fair skin, 15-30 for dark skin
2. Expose large areas: arms, legs, back (increases D production)
3. NO SUNSCREEN for brief vitamin D session
4. Apply sunscreen for prolonged exposure
5. Never allow skin to burn or turn pink

Frequency:
• 2-3 times weekly is often sufficient
• Vitamin D stored in fat tissue (lasts weeks)
• Daily sessions during winter months in northern climates

Monitor:
• Track your skin's response
• Aim for very light pink at most (minimal erythema)
• If skin turns red, reduce time next session
• Pain = too much exposure

Clothing Strategy:
• Unprotected: First 10-30 min for vitamin D
• Protected: After initial exposure, add clothing/sunscreen
• UPF clothing: Rated fabrics block UV (UPF 50 = blocks 98%)

Hydration & Nutrition:
• Drink extra water during sun exposure
• Antioxidants (vitamins C, E) may help protect skin from within
• Healthy fats help absorb vitamin D

Special Populations:
• Babies <6 months: No direct sun exposure
• Children: More sensitive, burn easily, need protection
• Elderly: Reduced vitamin D synthesis, may need more exposure
• Pregnancy: Same guidelines, vitamin D crucial for baby

Reflective Surfaces Increase Exposure:
• Fresh snow: 80% reflection
• Sand: 15% reflection  
• Water: 10-25% reflection
• Concrete: 10% reflection
• Grass: 2-3% reflection

Never:
• Stay in sun until burning
• Use tanning beds (15x skin cancer risk)
• Rely solely on sun for vitamin D if high skin cancer risk
• Forget eyes - UV damage causes cataracts (wear sunglasses!)`
    },
    {
        id: 8,
        title: 'The Science of Vitamin D Synthesis',
        content: `How UV creates Vitamin D in your skin:

1️⃣ UVB Photons (290-315nm wavelength) penetrate epidermis
2️⃣ Hit 7-dehydrocholesterol molecules in skin cells
3️⃣ Converted to Pre-Vitamin D3 (thermally unstable)
4️⃣ Body heat converts to Vitamin D3 (Cholecalciferol)
5️⃣ Travels to liver → converted to 25(OH)D (storage form)
6️⃣ Travels to kidneys → converted to 1,25(OH)₂D (active form)

Time Factors:
• Peak production: 20-30 min of exposure for fair skin
• Diminishing returns: >50% reduction after 15-20 min
• Skin saturates: Can't "stock up" - excess degrades
• Storage: Lasts 1-2 months in fatty tissue

Production Variables:
• Skin type: Darker = slower, needs more time
• Age: 70-year-old produces 25% of 20-year-old
• Body surface: Exposing 25% of body more efficient than 5%
• Sun angle: Best when sun is >45° above horizon
• Altitude: Higher = more UVB available
• Pollution: Can reduce UVB by 50%
• Glass: Blocks nearly all UVB

One Full-Body Exposure:
Can produce 10,000-25,000 IU vitamin D in 20-30 minutes
(Recommended daily: 600-800 IU, safe upper limit: 4,000 IU)

Supplementation vs. Sun:
Supplements: Consistent, safe, convenient
Sun: Free, mood benefits, full vitamin D metabolites
Many dermatologists recommend supplementation to minimize skin cancer risk`
    },
    {
        id: 9,
        title: 'Health Benefits & Optimal Levels',
        content: `Vitamin D Blood Levels:
• Deficient: <20 ng/mL (<50 nmol/L)
• Insufficient: 20-30 ng/mL (50-75 nmol/L)
• Sufficient: 30-50 ng/mL (75-125 nmol/L)
• Optimal (for some): 40-60 ng/mL (100-150 nmol/L)
• Too High: >100 ng/mL (>250 nmol/L) - toxic

Research-Backed Benefits:
Proven:
• Bone health & fracture prevention
• Rickets prevention (children)
• Osteomalacia prevention (adults)
• Reduced fall risk in elderly

Promising (ongoing research):
• Reduced COVID-19 severity
• Lower Type 2 diabetes risk
• Reduced depression symptoms
• Autoimmune disease management (MS, rheumatoid arthritis)
• Reduced heart disease risk
• Better pregnancy outcomes
• Cognitive function preservation

Testing:
• Ask doctor for 25(OH)D blood test
• Test in late winter for lowest levels
• Costs $30-50 if not covered by insurance

Supplementation Guide:
• Maintenance: 1000-2000 IU daily
• Deficiency correction: 5000 IU daily for 8-12 weeks
• Take with fatty meal (fat-soluble vitamin)
• Vitamin D3 (cholecalciferol) preferred over D2
• Safe upper limit: 4000 IU long-term

Quick Vitamin D Facts:
• Half-life: ~15 days (stays in body for weeks)
• Toxicity rare: Requires >10,000 IU daily for months
• Cannot overdose from sun (body self-regulates)
• Stored in fat tissue and muscle`
    },
    {
        id: 10,
        title: 'Advanced Tips & Strategies',
        content: `Smart Strategies:

"Solar Noon" Method:
When your shadow is shorter than your height, UVB is strongest
Use shadow length as natural UV meter!

"Vitamin D Window":
Mid-spring to mid-fall in temperate zones (Mar-Oct)
Winter months >37° latitude: Very limited UVB, consider supplements

Expose Strategic Body Parts:
• Arms + face = 9% body surface
• Add legs = 35% body surface
• Torso (back/chest) = 18% body surface
More surface = faster vitamin D production!

"Sunlight Savings Account":
Build up vitamin D stores in summer for winter
Body can store enough to last 1-2 months

Reflective Surfaces Strategy:
• Sit near white wall: Increases UV exposure ~20%
• Beach + water combo: Maximize reflection
• Snow skiing: Natural vitamin D boost (but wear sunscreen!)

Temperature Myth:
Heat ≠ UV radiation
You can burn on cool, cloudy days!
UV is invisible - don't rely on feeling hot

Eye Protection:
• UV damages cornea and lens
• Long-term: Cataracts, macular degeneration
• Choose sunglasses: "100% UV protection" or "UV400"
• Wrap-around style best (blocks side rays)

Outdoor Exercise Bonus:
• Walk/jog without shirt (men) or sports bra (women)
• Combine fitness + vitamin D
• Morning: Gentler UV, energizing
• Just 15-20 minutes sufficient

UV Index Apps:
• Check daily UV forecast
• Plan outdoor activities accordingly
• Many weather apps include UV index

Genetic Factors:
• VDR gene variations affect vitamin D needs
• CYP2R1 gene affects conversion efficiency
• Consider genetic testing if persistent low levels despite supplementation

Travel Considerations:
• Equator: Year-round strong UVB
• Tropics: UV index often 11+ (extreme)
• Reduce exposure time when traveling to high-UV regions
• Altitude: Every 1000m = 10% more UV

Balance is Key:
Not too little (deficiency) ← OPTIMAL → Not too much (skin damage)
Aim for the sweet spot: enough vitamin D, minimal skin cancer risk`
    },
    {
        id: 11,
        title: 'Scientific Evidence Points for SUNTIME',
        content: [
            {
                title: 'Sunlight is the Primary Source of Vitamin D',
                text: 'Human skin produces Vitamin D when UVB rays from sunlight hit cholesterol in the skin. Most people do not get sufficient Vitamin D from food alone — sun exposure is essential. This supports SUNTIME’s core feature of tracking and optimizing sun exposure.',
                link: 'https://pubmed.ncbi.nlm.nih.gov/37284402/'
            },
            {
                title: 'Vitamin D Deficiency is Widespread Worldwide',
                text: 'Studies show high prevalence of Vitamin D deficiency even in sunny regions due to limited outdoor time. Lack of sun exposure is a major contributor to deficiency across different age groups. SUNTIME’s personalized exposure tracking can help identify and close these gaps.',
                link: 'https://pubmed.ncbi.nlm.nih.gov/32103645/'
            },
            {
                title: 'Skin Pigmentation Affects Vitamin D Synthesis',
                text: 'People with darker skin have more melanin, which inhibits UVB absorption. They need longer sunlight exposure for the same Vitamin D production. SUNTIME’s skin-type personalization is scientifically supported.',
                link: 'https://pubmed.ncbi.nlm.nih.gov/20554606/'
            },
            {
                title: 'Vitamin D Deficiency Has Health Consequences',
                text: 'Deficiency is linked to impaired bone health, muscle weakness, and lower immune function. Tracking sun exposure can help maintain healthier Vitamin D levels.',
                link: 'https://pubmed.ncbi.nlm.nih.gov/10885122/'
            },
            {
                title: 'One-Size-Fits-All Sun Guidelines Are Not Sufficient',
                text: 'General advice like “10–30 minutes of sun” ignores UV index, skin type, location, and season. Personalized recommendations like SUNTIME’s are safer and more accurate.',
                link: 'https://pubmed.ncbi.nlm.nih.gov/16603558/'
            }
        ]
    }
];

export default function LearnScreen() {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    const [expandedId, setExpandedId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSections = LEARN_SECTIONS.filter(section => {
        const query = searchQuery.toLowerCase();
        const titleMatch = section.title.toLowerCase().includes(query);
        let contentMatch = false;

        if (Array.isArray(section.content)) {
            contentMatch = section.content.some(item =>
                item.title.toLowerCase().includes(query) ||
                item.text.toLowerCase().includes(query)
            );
        } else {
            contentMatch = section.content.toLowerCase().includes(query);
        }

        return titleMatch || contentMatch;
    });

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={isDark ? GRADIENTS.night : GRADIENTS.sunrise}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                opacity={isDark ? 0.8 : 0.3}
            />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <Animated.View
                    entering={FadeInDown}
                    style={styles.header}
                >
                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Home')}
                            style={styles.backButton}
                        >
                            <ArrowLeft color={colors.text} size={24} />
                        </TouchableOpacity>

                    </View>
                    <Text style={styles.title}>Learn About Sun Safety</Text>
                    <Text style={styles.subtitle}>
                        Tap any topic to learn more
                    </Text>
                </Animated.View>

                {/* Search Bar */}
                <Animated.View
                    entering={FadeInDown}
                    style={styles.searchContainer}
                >
                    <Search color={colors.textSecondary} size={20} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search topics..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X color={colors.textSecondary} size={20} />
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* Accordion List */}
                {filteredSections.map((section, index) => {
                    const isExpanded = expandedId === section.id;

                    return (
                        <Animated.View
                            entering={FadeInDown}
                            key={section.id}
                            style={styles.accordionItem}
                        >
                            {/* Clickable Header */}
                            <TouchableOpacity
                                style={[
                                    styles.accordionHeader,
                                    isExpanded && styles.accordionHeaderExpanded
                                ]}
                                onPress={() => setExpandedId(isExpanded ? null : section.id)}
                                activeOpacity={0.7}
                            >
                                {(() => {
                                    const IconComponent = IconMap[section.id.toString()];
                                    return <IconComponent color={colors.primary} size={moderateScale(24)} style={{ marginRight: SPACING.md }} />;
                                })()}
                                <Text style={styles.accordionTitle}>{section.title}</Text>
                                <Text style={styles.accordionArrow}>
                                    {isExpanded ? '▼' : '▶'}
                                </Text>
                            </TouchableOpacity>

                            {/* Expandable Content */}
                            {isExpanded && (
                                <View
                                    style={styles.accordionContent}
                                >
                                    {Array.isArray(section.content) ? (
                                        section.content.map((point, idx) => (
                                            <View key={idx} style={{ marginBottom: SPACING.lg }}>
                                                <Text style={[styles.accordionTitle, { fontSize: moderateScale(16), marginBottom: SPACING.xs }]}>
                                                    {idx + 1}. {point.title}
                                                </Text>
                                                <Text style={[styles.accordionText, { marginBottom: SPACING.sm }]}>
                                                    {point.text}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => Linking.openURL(point.link)}
                                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                                >
                                                    <Text style={{ color: colors.primary, marginRight: SPACING.xs, ...TYPOGRAPHY.caption }}>
                                                        View Reference
                                                    </Text>
                                                    <ExternalLink size={14} color={colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.accordionText}>{section.content}</Text>
                                    )}
                                </View>
                            )}
                        </Animated.View>
                    );
                })}

                {filteredSections.length === 0 && (
                    <View style={styles.emptySearch}>
                        <Text style={styles.emptySearchText}>No topics found matching "{searchQuery}"</Text>
                    </View>
                )}

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        This information is for educational purposes only. Consult a healthcare professional for personalized recommendations.
                    </Text>
                </View>

                {/* References Note */}
                <View style={styles.references}>
                    <Text style={styles.referencesText}>
                        Information compiled from: WHO, American Academy of Dermatology, National Institutes of Health, Vitamin D Council, and peer-reviewed dermatology research.
                    </Text>
                </View>
            </ScrollView>


        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 120, // Increased to clear navigation bar
    },
    header: {
        marginBottom: SPACING.lg,
        paddingTop: SPACING.xs,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    backButton: {
        marginRight: SPACING.sm,
        padding: SPACING.xs,
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: moderateScale(32),
        color: colors.text,
        marginTop: SPACING.xs,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        lineHeight: 24,
        marginTop: SPACING.xs,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
        marginBottom: SPACING.xl,
        ...SHADOWS.small,
        ...(colors.background === '#121212' ? GLASS.dark : GLASS.default),
        borderWidth: 0,
    },
    searchIcon: {
        marginRight: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        ...TYPOGRAPHY.body,
        fontSize: moderateScale(16),
        color: colors.text,
        padding: 0, // Remove default padding for centered look
    },
    emptySearch: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptySearchText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    accordionItem: {
        marginBottom: SPACING.md,
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.small,
        ...(colors.background === '#121212' ? GLASS.dark : GLASS.default),
        borderWidth: 0,
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: colors.cardBackground,
    },
    accordionHeaderExpanded: {
        backgroundColor: colors.backgroundLight,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    accordionIcon: {
        fontSize: moderateScale(28),
        marginRight: SPACING.md,
    },
    accordionTitle: {
        ...TYPOGRAPHY.heading,
        fontSize: moderateScale(18),
        flex: 1,
        color: colors.text,
    },
    accordionArrow: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: 'bold',
    },
    accordionContent: {
        padding: SPACING.lg,
        backgroundColor: colors.white,
    },
    accordionText: {
        ...TYPOGRAPHY.body,
        lineHeight: 24,
        color: colors.text,
    },
    disclaimer: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.lg,
        marginTop: SPACING.xl,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
    },
    disclaimerText: {
        ...TYPOGRAPHY.caption,
        fontStyle: 'italic',
        color: colors.textSecondary,
        lineHeight: 20,
    },
    references: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginTop: SPACING.lg,
    },
    referencesText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        lineHeight: 18,
        fontStyle: 'italic',
    },
});
